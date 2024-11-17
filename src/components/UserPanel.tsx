import { PDFDocument, PDFImage } from 'pdf-lib';
import { useEffect, useRef, useState } from 'react';
import { Document, Page } from "react-pdf";
import { DocumentCallback } from 'react-pdf/src/shared/types.js';
import { IFieldDetails } from '../helper/interface';
import { urlToFileName } from '../helper/utils';
import '../pdf-worker.config';

interface IProps {
    pdfFile: File;
}

const UserPanel = ({ pdfFile }: IProps) => {
    const [fields, setFields] = useState<IFieldDetails[]>([]);
    const [signature, setSignature] = useState<File>();
    const [pageNumber, setPageNumber] = useState<number>(0);
    const [numPages, setNumPages] = useState<number>(0);
    const [signatureDetails, setSignatureDetails] = useState<IFieldDetails[]>([]);
    const pdfCanvasRef = useRef<HTMLDivElement>(null);

    const drawSignatureField = (id: string, fieldName: string, posX: number, posY: number, height: number, width: number) => {
        const viewerElement = pdfCanvasRef?.current?.querySelector('.page-container') as HTMLElement;
        viewerElement.style.position = 'relative';
        if (viewerElement) {
            console.log('signatureBoxPosition:');

            const sealedSignatureDiv = document.createElement('div');
            sealedSignatureDiv.id = id;
            sealedSignatureDiv.style.position = 'absolute';
            sealedSignatureDiv.style.left = `${posX}px`;
            sealedSignatureDiv.style.top = `${posY}px`;
            sealedSignatureDiv.style.width = width + 'px';
            sealedSignatureDiv.style.height = height + 'px';
            sealedSignatureDiv.style.backgroundColor = 'rgba(51, 204, 51, 0.2)';
            sealedSignatureDiv.style.border = '2px dashed green';
            sealedSignatureDiv.style.color = 'black';
            sealedSignatureDiv.style.display = 'flex';
            sealedSignatureDiv.style.justifyContent = 'center';
            sealedSignatureDiv.style.alignItems = 'center';
            sealedSignatureDiv.textContent = fieldName;

            viewerElement.appendChild(sealedSignatureDiv);
        }
    }

    const removeSignatureField = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    const drawSignature = (posX: number, posY: number, height: number, width: number, type: string) => {
        const canvas = document.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;
        const adjustedX = posX * scaleX;
        const adjustedY = posY * scaleY;
        if (type == 'DATE') {
            const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
            const fontSize = height * 0.6; // Adjust scale factor (0.6) if needed
            ctx.font = `${fontSize}px Arial`;
            ctx.textBaseline = 'middle'; // Align text vertically to its middle

            // Measure text width to center it horizontally
            const startX = adjustedX;
            const centerY = adjustedY + (height * scaleY) / 2;

            ctx.fillText(currentDate, startX, centerY);
            return;
        }
        const image: HTMLImageElement = new Image();
        image.src = URL.createObjectURL(signature as File);
        image.onload = () => {
            ctx.drawImage(image, adjustedX, adjustedY, width * scaleX, height * scaleY);
        };
    }

    const onDocumentLoadSuccess = (pdf: DocumentCallback) => {
        const pdfFileName = pdfFile instanceof File ? pdfFile?.name : urlToFileName(pdfFile);
        const storedFields = localStorage.getItem(pdfFileName);
        if (storedFields) {
            setFields(JSON.parse(storedFields));
        }
        setNumPages(pdf?.numPages);
        setPageNumber(1);
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
        if (fields.some(field => field.id == divId) && field) {
            drawSignature(field?.positionX, field?.positionY, field?.height, field?.width, field?.fieldType);
            setSignatureDetails((prev: IFieldDetails[]) => [...prev, {
                id: field?.id,
                fieldName: field?.fieldName,
                fieldType: field?.fieldType,
                positionX: field?.positionX,
                positionY: field?.positionY,
                height: field?.height,
                width: field?.width,
                pageNumber: field?.pageNumber
            }])
            removeSignatureField(divId);
            setFields(fields.filter(field => field.id !== divId));
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
            signatureImage = await pdfDoc.embedPng(signatureArrayBuffer); //
        } else if (signature.type === 'image/jpeg') {
            signatureImage = await pdfDoc.embedJpg(signatureArrayBuffer); //
        }

        const baseFontSize = 12; // Base font size
        const baseSignatureWidth = 100; // Base signature width for scaling
        const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
        signatureDetails?.map((signature => {
            const page = pdfDoc.getPage(signature?.pageNumber - 1);
            if (!(pdfCanvasRef?.current)) return;
            const viewport = pdfCanvasRef.current.getBoundingClientRect();
            const pdfX = (Number(signature?.positionX) / viewport.width) * page.getWidth();
            const pdfY = page.getHeight() - (Number(signature?.positionY) / viewport.height) * page.getHeight() - Number(signature?.height);
            const textSize = (Number(signature?.width) / baseSignatureWidth) * baseFontSize;
            if (signature?.fieldType == 'SIGNATURE') {
                page.drawImage(signatureImage, {
                    x: pdfX,
                    y: pdfY,
                    width: Number(signature?.width),
                    height: Number(signature?.height),
                });
            } else {
                page.drawText(currentDate, {
                    x: pdfX,
                    y: pdfY + textSize,
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
        const removeFileds = fields.filter(field => field.pageNumber != pageNumber);
        const addFileds = fields.filter(field => field.pageNumber == pageNumber);

        removeFileds.map(fields => {
            removeSignatureField(fields?.id);
        })
        addFileds.map(fields => {
            drawSignatureField(
                fields?.id,
                fields?.fieldName,
                fields?.positionX,
                fields?.positionY,
                fields?.height,
                fields?.width
            );
        });

        setTimeout(() => {
            const addSignature = signatureDetails.filter(signature => signature?.pageNumber == pageNumber);
            addSignature.map(signature => {
                drawSignature(
                    signature?.positionX,
                    signature?.positionY,
                    signature?.height,
                    signature?.width,
                    signature?.fieldType,
                );
            })
        }, 50);
    }, [pageNumber]);

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
                            >
                                <Page
                                    className={'page-container'}
                                    pageNumber={pageNumber}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    onClick={handleSetSignature}
                                />
                            </Document>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 10 }}>
                            <button onClick={() => setPageNumber((prevPage) => prevPage - 1)} disabled={pageNumber <= 1}>
                                Previous Page
                            </button>
                            <div>Page {pageNumber} of {numPages}</div>
                            <button onClick={() => setPageNumber((prevPage) => prevPage + 1)} disabled={pageNumber >= numPages}>
                                Next Page
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default UserPanel
