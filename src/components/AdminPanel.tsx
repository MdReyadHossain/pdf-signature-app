import { MouseEvent, useEffect, useRef, useState } from "react";
import Draggable from "react-draggable";
import { Document, Page } from "react-pdf";
import { DocumentCallback } from "react-pdf/src/shared/types.js";
import { IFieldDetails } from "../helper/interface";
import { generateUid } from "../helper/utils";
import '../pdf-worker.config';
import { useNavigate } from "react-router-dom";

interface IProps {
    handleSendToUser: (pdfFile: File) => void;
}

const AdminPanel = ({ handleSendToUser }: IProps) => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState<File>();
    const [fields, setFields] = useState<IFieldDetails[]>([]);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(0);
    const [signatureBoxPosition, setSignatureBoxPosition] = useState<any>({ x: 0, y: -100, posX: 0, posY: 0 });
    const [signatureBoxSize, setSignatureBoxSize] = useState<any>({ boxH: 50, boxW: 100 });

    const [signField, setSignField] = useState<boolean>(false);
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

    const onSignDragStart = (event: any) => {
        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = event.clientX - pdfContainer.left;
        const dataY = event.clientY - pdfContainer.bottom;

        console.log(`left: ${pdfContainer.left}; top: ${pdfContainer.top}`);
        // Update the signatureBoxPosition to set the element at the mouse pointer's position
        setSignatureBoxPosition({
            posX: dataX,
            posY: dataY,
            x: dataX,
            y: dataY
        });
    }

    const onSignDrag = (event: any, data: any) => {
        if (!pdfCanvasRef?.current) return;
        const viewerRect = pdfCanvasRef.current.getBoundingClientRect();
        const pdfX = event.clientX - viewerRect.left;
        const pdfY = event.clientY - viewerRect.top;
        const cord = {
            x: data.x,
            y: data.y,
            posX: pdfX,
            posY: pdfY
        }
        setSignatureBoxPosition(cord);
    }

    const onSignBoxHeight = (event: any) => {
        const value = event.target.value;
        setSignatureBoxSize((prev: any) => ({ ...prev, boxH: value }));
    }

    const onSignBoxWidth = (event: any) => {
        const value = event.target.value;
        setSignatureBoxSize((prev: any) => ({ ...prev, boxW: value }));
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setPdfFile(files[0]);
    }

    const onDocumentLoadSuccess = (pdf: DocumentCallback) => {
        setNumPages(pdf?.numPages);
        setPageNumber(1);
    }

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        console.log('====handleClick=====');
        // const pageContainer = document.querySelector('.page-container');
        if (pdfCanvasRef?.current) {
            const viewerRect = pdfCanvasRef.current.getBoundingClientRect();

            const pdfX = event.clientX - viewerRect.left;
            const pdfY = event.clientY - viewerRect.top;
            console.log(`x: ${Math.floor(pdfX)}, y: ${Math.floor(pdfY)}`);
            console.log('page-number: ', pageNumber);
        }
        console.log('signatureBoxPosition #', signatureBoxPosition);
        console.log('fields #', fields);
    }

    const handleRemoveSignatureBox = (event: MouseEvent) => {
        const divId = (event.target as HTMLElement)?.id;
        if (fields.some(field => field.id == divId)) {
            removeSignatureField(divId);
            setFields(fields.filter(field => field.id !== divId));
        }
    }

    const handleSetSignatureBox = () => {
        const fieldId: string = `field-${generateUid()}`;
        drawSignatureField(
            fieldId,
            'Signature Field',
            signatureBoxPosition.posX,
            signatureBoxPosition.posY,
            signatureBoxSize.boxH,
            signatureBoxSize.boxW
        );
        setFields((prev: IFieldDetails[]) => [...prev, {
            id: fieldId,
            fieldName: 'Signature Field',
            positionX: signatureBoxPosition.posX,
            positionY: signatureBoxPosition.posY,
            width: signatureBoxSize.boxW,
            height: signatureBoxSize.boxH,
            pageNumber: pageNumber
        }]);
    }

    const onSubmit = () => {
        const pdfFileName = pdfFile?.name;
        if (pdfFileName) {
            localStorage.setItem(pdfFileName, JSON.stringify(fields));
        }
        handleSendToUser(pdfFile as File);
        navigate('/user');
    }

    useEffect(() => {
        console.log('change page', pageNumber);
        const removeFileds = fields.filter(field => field.pageNumber != pageNumber);
        const addFileds = fields.filter(field => field.pageNumber == pageNumber);

        console.log('removeFileds #', removeFileds);
        console.log('addFileds #', addFileds);

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
        })
    }, [pageNumber]);
    return (

        <div>
            <h3>Admin Panel</h3>
            <input type="file" onChange={handleFileUpload} />

            <div className="document">
                {
                    pdfFile && (
                        <>
                            <div>
                                <button onClick={() => setSignField((prev) => !prev)}>
                                    {signField ? 'Remove' : 'Add'} Signature Field
                                </button>
                                {signField && (
                                    <div
                                        className="signature-action"
                                        style={{
                                            display: "flex",
                                            justifyContent: "center",
                                            gap: 10,
                                            margin: "10px"
                                        }}
                                    >
                                        <button onClick={handleSetSignatureBox}>
                                            Set Signature Field
                                        </button>
                                        <label htmlFor="">Hight</label>
                                        <input type="number" value={signatureBoxSize.boxH} id="" onChange={onSignBoxHeight} />
                                        <label htmlFor="">Width</label>
                                        <input type="number" value={signatureBoxSize.boxW} id="" onChange={onSignBoxWidth} />
                                        <button onClick={onSubmit}>
                                            Save
                                        </button>
                                    </div>
                                )}
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
                                    onClick={handleClick}
                                >
                                    <Page
                                        className={'page-container'}
                                        pageNumber={pageNumber}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onClick={handleRemoveSignatureBox}
                                    >
                                        {signField && (
                                            <Draggable
                                                position={signatureBoxPosition}
                                                onStart={onSignDragStart}
                                                onDrag={onSignDrag}
                                                bounds='parent'
                                            >
                                                <div
                                                    style={{
                                                        width: signatureBoxSize.boxW + 'px',
                                                        height: signatureBoxSize.boxH + 'px',
                                                        backgroundColor: 'rgba(0, 0, 255, 0.2)',
                                                        border: '2px dashed blue',
                                                        cursor: 'default',
                                                        position: 'absolute',
                                                        color: 'black',
                                                        zIndex: 10
                                                    }}
                                                >
                                                    Signature Field
                                                </div>
                                            </Draggable>
                                        )}
                                    </Page>
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
                    )
                }
            </div>
        </div>
    )
}

export default AdminPanel
