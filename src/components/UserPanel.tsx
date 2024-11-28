import { PDFDocument, PDFImage } from 'pdf-lib';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Document, Page } from "react-pdf";
import { DocumentCallback } from 'react-pdf/src/shared/types.js';
import { IFieldData, IFieldDetails } from '../helper/interface';
import { urlToFileName } from '../helper/utils';
import '../pdf-worker.config';
import { IoMdWarning } from 'react-icons/io';
import { generateClickField, generateTextField } from '../helper/htmlStrings';

interface IProps {
    pdfFile: File;
}

const UserPanel = ({ pdfFile }: IProps) => {
    const [fields, setFields] = useState<IFieldDetails[]>([]);
    const [signature, setSignature] = useState<File>();
    const [numPages, setNumPages] = useState<number>(0);
    const [signatureDetails, setSignatureDetails] = useState<IFieldDetails[]>([]);
    const [error, setError] = useState<string | null>();
    const pdfCanvasRef = useRef<HTMLDivElement>(null);
    const signatureDetailsRef = useRef<IFieldDetails[]>(signatureDetails);

    const drawField = (field: IFieldData) => {
        if (field?.viewerElement)
            field.viewerElement.style.position = 'relative';
        if (field?.viewerElement) {
            if (field?.fieldType == 'TEXT') {
                field?.viewerElement.insertAdjacentHTML('beforeend', generateTextField(field));
                const inputElement = document.getElementById(`text-${field?.id}`) as HTMLInputElement;
                if (inputElement) {
                    inputElement.onchange = (e: any) => onChangeText(e, field?.id ?? '');
                }
            }
            else
                field?.viewerElement.insertAdjacentHTML('beforeend', generateClickField(field));
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
            const fontSize = 12;
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

    const onChangeText = (e: ChangeEvent<HTMLInputElement>, id: string) => {
        const signatureField = signatureDetailsRef?.current;
        const value = e.target.value;
        setSignatureDetails(signatureField?.map(field => field.id === id ? { ...field, textValue: value } : field));
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
        console.log('fields #', fields);
        const divId = (event.target as HTMLElement)?.id;
        const field = fields.find(field => field.id === divId);
        if (field) {
            if (field?.fieldType == 'TEXT') return;
            if (field?.fieldType == 'SIGNATURE' && !signature) {
                setError('Signature did not uploaded yet');
                return;
            }
            const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[field?.pageNumber] as HTMLCanvasElement;
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
        let pdfArrayBuffer;
        if (typeof pdfFile == 'string') {
            const pdfResponse = await fetch(pdfFile);
            pdfArrayBuffer = await pdfResponse.arrayBuffer();
        } else
            pdfArrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

        for (let i = 0; i < fields?.length; i++) {
            if (fields[i]?.fieldType == 'TEXT') continue;
            if (!fields[i]?.required) continue;
            setError('Required fields(*) are not field yet!');
            return;
        }
        if (signatureDetails?.some(field => field?.fieldType === 'TEXT' && field?.required && field?.textValue == "")) {
            console.log('Required text fields');
            setError('Required text fields(*) are not filled yet!');
            return;
        }

        const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
        for (const field of signatureDetails) {
            const page = pdfDoc.getPage(field?.pageNumber);

            if (!(pdfCanvasRef?.current)) return;
            const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[field?.pageNumber] as HTMLCanvasElement
            const viewport = canvas?.getBoundingClientRect();
            const fieldX = (Number(field?.positionX) / viewport?.width) * page?.getWidth();
            const fieldY = page.getHeight() - (Number(field?.positionY) / viewport?.height) * page.getHeight();

            const signatureWidth = (Number(field?.width) / 100) * page?.getWidth();
            const signatureHeight = (Number(field?.height) / 100) * page?.getHeight();

            const heightInPx = signatureHeight;
            const textSize = heightInPx * 0.6;

            if (field?.fieldType == 'SIGNATURE') {
                if (!signature) {
                    setError('Signature did not uploaded yet');
                    return;
                } else {
                    const signatureArrayBuffer = await signature.arrayBuffer();
                    let signatureImage: PDFImage;
                    if (signature.type === 'image/png') {
                        signatureImage = await pdfDoc.embedPng(signatureArrayBuffer);
                    } else if (signature.type === 'image/jpeg') {
                        signatureImage = await pdfDoc.embedJpg(signatureArrayBuffer);
                    } else {
                        setError('Unsupported signature format');
                        return;
                    }
                    page.drawImage(signatureImage, {
                        x: fieldX,
                        y: fieldY - signatureHeight,
                        width: signatureWidth,
                        height: signatureHeight
                    });
                }
            } else {
                page.drawText(field?.fieldType == 'DATE' ? currentDate : (field?.textValue ?? ''), {
                    x: fieldX,
                    y: fieldY - textSize,
                    size: 10
                });
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        const fileName = "abc";
        link.download = fileName;
        link.click();
    }

    useEffect(() => {
        fields.map(field => {
            const viewerElement = pdfCanvasRef?.current?.querySelectorAll('.page-container')[field?.pageNumber] as HTMLElement;
            drawField({
                required: field?.required,
                fieldType: field?.fieldType,
                fieldName: field?.fieldName,
                height: field?.height,
                width: field?.width,
                posX: field?.positionX,
                posY: field?.positionY,
                viewerElement: viewerElement,
                id: field?.id,
            });
            setTimeout(() => {
                const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[field?.pageNumber] as HTMLCanvasElement;
                const canvasHeight = canvas?.style.height;
                const canvasWidth = canvas?.style.width;
                if (field?.fieldType == 'TEXT') {
                    setSignatureDetails((prev: IFieldDetails[]) => [...prev, {
                        id: field?.id,
                        fieldName: field?.fieldName,
                        fieldType: field?.fieldType,
                        positionX: (field?.positionX / 100) * parseInt(canvasWidth),
                        positionY: (field?.positionY / 100) * parseInt(canvasHeight),
                        height: field?.height,
                        width: field?.width,
                        pageNumber: field?.pageNumber,
                        textValue: '',
                        required: field?.required
                    }])
                }
            }, 500);
        });
    }, [numPages]);

    useEffect(() => {
        signatureDetailsRef.current = signatureDetails;
    }, [signatureDetails]);

    useEffect(() => {
        if (error) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
                setError(null);
            }, 3000);
        }
    }, [error]);
    return (
        <div>
            <h3 onClick={() => console.log('signatureDetails #', signatureDetails)}>User Panel</h3>
            <input type="file" accept=".png, .jpeg, .jpg" onChange={handleSignatureUpload} />
            <div className="document">
                {pdfFile && (
                    <>
                        <div>
                            <button onClick={onSignatureDone}>Done</button>
                        </div>
                        {error && (
                            <div className="alert">
                                <span className="closebtn" onClick={() => setError(null)}>&times;</span>
                                <strong><IoMdWarning /></strong> {error}
                            </div>
                        )}
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
