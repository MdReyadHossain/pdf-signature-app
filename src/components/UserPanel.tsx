import { PDFDocument, PDFImage } from 'pdf-lib';
import { useEffect, useRef, useState } from 'react';
import { Document, Page } from "react-pdf";
import { DocumentCallback } from 'react-pdf/src/shared/types.js';
import { IFieldData, IFieldDetails } from '../helper/interface';
import { urlToFileName } from '../helper/utils';
import '../pdf-worker.config';

interface IProps {
    pdfFile: File;
}

const UserPanel = ({ pdfFile }: IProps) => {
    const [fields, setFields] = useState<IFieldDetails[]>([]);
    const [signature, setSignature] = useState<File>();
    const [numPages, setNumPages] = useState<number>(0);
    const [signatureDetails, setSignatureDetails] = useState<IFieldDetails[]>([]);
    const pdfCanvasRef = useRef<HTMLDivElement>(null);

    const drawField = (field: IFieldData) => {
        if (field?.viewerElement)
            field.viewerElement.style.position = 'relative';
        if (field?.viewerElement) {
            const htmlString = `
                    <div 
                        id="${field?.id ?? ''}" 
                        style="
                            position: absolute;
                            left: ${field?.posX}%;
                            top: ${field?.posY}%;
                            width: ${field?.width}%;
                            height: ${field?.height}%;
                            background-color: rgba(51, 204, 51, 0.2);
                            border: 2px dashed green;
                            cursor: grab;
                            color: black;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        ">
                        ${field?.fieldName ?? 'Field'}
                    </div>
                `;
            field?.viewerElement.insertAdjacentHTML('beforeend', htmlString);
        }
    }

    const removeSignatureField = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    const drawSignature = (field: IFieldData) => {
        const canvas = field?.viewerElement as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        const adjustedX = field?.posX * scaleX;
        const adjustedY = field?.posY * scaleY;
        const widthInPx = (field?.width / 100) * canvas.width;
        const heightInPx = (field?.height / 100) * canvas.height;
        if (field?.fieldType == 'DATE') {
            const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
            const fontSize = heightInPx * 0.6;
            ctx.font = `${fontSize}px Arial`;
            ctx.textBaseline = 'middle';
            const startX = adjustedX;
            const centerY = adjustedY + (heightInPx * scaleY) / 2;
            ctx.fillText(currentDate, startX, centerY);
            return;
        }
        const image: HTMLImageElement = new Image();
        image.src = URL.createObjectURL(signature as File);
        image.onload = () => {
            ctx.drawImage(image, adjustedX, adjustedY, widthInPx * scaleX, heightInPx * scaleY);
        };
    }

    const onDocumentLoadSuccess = (pdf: DocumentCallback) => {
        const pdfFileName = pdfFile instanceof File ? pdfFile?.name : urlToFileName(pdfFile);
        const storedFields = localStorage.getItem(pdfFileName);
        if (storedFields) {
            setFields(JSON.parse(storedFields));
        }
        setNumPages(pdf?.numPages);
    }

    const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setSignature(files[0]);
    }

    const handleSetSignature = (event: MouseEvent) => {
        console.log('signatureDetails #', signatureDetails);
        const divId = (event.target as HTMLElement)?.id;
        const field = fields.find(field => field.id === divId);
        if (field) {
            const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[field?.pageNumber] as HTMLCanvasElement
            const canvasHeight = canvas?.style.height;
            const canvasWidth = canvas?.style.width;
            drawSignature({
                fieldType: field?.fieldType,
                posX: (field?.positionX / 100) * parseInt(canvasWidth),
                posY: (field?.positionY / 100) * parseInt(canvasHeight),
                height: field?.height,
                width: field?.width,
                viewerElement: canvas,
            });
            setSignatureDetails((prev: IFieldDetails[]) => [...prev, {
                id: field?.id,
                fieldName: field?.fieldName,
                fieldType: field?.fieldType,
                positionX: (field?.positionX / 100) * parseInt(canvasWidth),
                positionY: (field?.positionY / 100) * parseInt(canvasHeight),
                height: field?.height,
                width: field?.width,
                pageNumber: field?.pageNumber
            }])
            removeSignatureField(divId);
            setFields(fields?.filter(field => field?.id !== divId));
        }
    }

    const onSignatureDone = async () => {
        console.log('signatureDetails #', signatureDetails);
        if (!signature) return;
        const signatureArrayBuffer = await signature.arrayBuffer(); //
        let pdfArrayBuffer;
        if (typeof pdfFile == 'string') {
            const pdfResponse = await fetch(pdfFile);
            pdfArrayBuffer = await pdfResponse.arrayBuffer();
        } else
            pdfArrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfArrayBuffer);
        let signatureImage: PDFImage;
        if (signature.type === 'image/png') {
            signatureImage = await pdfDoc.embedPng(signatureArrayBuffer);
        } else if (signature.type === 'image/jpeg') {
            signatureImage = await pdfDoc.embedJpg(signatureArrayBuffer);
        }

        const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
        signatureDetails?.map((signature => {
            const page = pdfDoc.getPage(signature?.pageNumber);
            console.log('page?.width: ', page?.getWidth());
            console.log('page?.height: ', page.getHeight());
            if (!(pdfCanvasRef?.current)) return;
            const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[signature?.pageNumber] as HTMLCanvasElement
            const viewport = canvas?.getBoundingClientRect();
            const pdfX = (Number(signature?.positionX) / viewport?.width) * page?.getWidth();
            const pdfY = page.getHeight() - (Number(signature?.positionY) / viewport?.height) * page.getHeight()

            const signatureWidth = (Number(signature?.width) / 100) * page?.getWidth();
            const signatureHeight = (Number(signature?.height) / 100) * page?.getHeight();

            const heightInPx = signatureHeight;
            const textSize = heightInPx * 0.6;

            if (signature?.fieldType == 'SIGNATURE') {
                page.drawImage(signatureImage, {
                    x: pdfX,
                    y: pdfY - signatureHeight,
                    width: signatureWidth,
                    height: signatureHeight,
                });
            } else {
                page.drawText(currentDate, {
                    x: pdfX,
                    y: pdfY - textSize,
                    size: textSize
                });
            }
        }))

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        const fileName = "abc";
        link.download = fileName;
        link.click();
    }

    useEffect(() => {
        fields.map(fields => {
            const viewerElement = pdfCanvasRef?.current?.querySelectorAll('.page-container')[fields?.pageNumber] as HTMLElement;
            drawField({
                fieldName: fields?.fieldName,
                height: fields?.height,
                width: fields?.width,
                posX: fields?.positionX,
                posY: fields?.positionY,
                viewerElement: viewerElement,
                id: fields?.id,
            });
        });
    }, [numPages]);

    return (
        <div>
            <h3>User Panel</h3>
            <input type="file" onChange={handleSignatureUpload} />
            <div className="document">
                {pdfFile && (
                    <>
                        <div>
                            <button onClick={onSignatureDone}>Done</button>
                        </div>
                        <div
                            className="pdf-container"
                            ref={pdfCanvasRef}
                            style={{
                                width: 'auto',
                                display: 'inline-block',
                                margin: 10
                            }}
                        >
                            <Document
                                file={pdfFile}
                                onLoadSuccess={onDocumentLoadSuccess}
                                // onClick={handleClick}
                                onClick={handleSetSignature}
                            >
                                {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => {
                                    return (
                                        <>
                                            <Page
                                                key={page}
                                                scale={1}
                                                width={1100}
                                                className={'page-container page-number-' + page}
                                                pageNumber={page}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                            >
                                            </Page>
                                            <div style={{ height: 10 }}></div>
                                        </>
                                    );
                                })}
                            </Document>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default UserPanel
