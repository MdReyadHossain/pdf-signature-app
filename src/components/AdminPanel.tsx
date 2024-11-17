import { MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { DraggableEvent } from "react-draggable";
import { Document, Page } from "react-pdf";
import { DocumentCallback } from "react-pdf/src/shared/types.js";
import { useNavigate } from "react-router-dom";
import { IFieldButton, IFieldDetails, ISignaturePosition, ISignatureSize } from "../helper/interface";
import { generateUid, urlToFileName } from "../helper/utils";
import '../pdf-worker.config';
import { fieldButtons } from "../helper/docSignature";

interface IProps {
    handleSendToUser: (pdfFile: File) => void;
}

const AdminPanel = ({ handleSendToUser }: IProps) => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState<File | string>('https://cdn.filestackcontent.com/wcrjf9qPTCKXV3hMXDwK');
    const [fields, setFields] = useState<IFieldDetails[]>([]);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(0);
    const [signatureBox, setSignatureBox] = useState<{ fieldName: string, fieldType: string }>({ fieldName: '', fieldType: '' });
    const [signatureBoxPosition, setSignatureBoxPosition] = useState<ISignaturePosition>({ x: 0, y: -300, posX: 0, posY: 0 });
    const [signatureBoxSize, setSignatureBoxSize] = useState<ISignatureSize>({ boxH: 50, boxW: 100 });

    const [fieldBox, setFieldBox] = useState<boolean>(false);
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

    const onSignDragStart = (event: MouseEvent | DraggableEvent) => {
        // const target = event.target as HTMLElement;
        // if (target && target.classList.contains('resize')) {
        //     event.stopPropagation();
        //     return;
        // }
        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = (event as MouseEvent).clientX - pdfContainer.left;
        const dataY = (event as MouseEvent).clientY - pdfContainer.bottom;

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
        // const target = event.target as HTMLElement;
        // if (target && target.classList.contains('resize')) {
        //     event.stopPropagation();
        //     return;
        // }
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
    let x: number, y: number;
    const onResizeStart = (event: MouseEvent) => {
        event.stopPropagation();
        if (!pdfCanvasRef?.current) return;
        // console.log('onResizeStart', `event.clientX: ${event.clientX}, event.clientY: ${event.clientY}`);

        const viewerRect = pdfCanvasRef.current.getBoundingClientRect();
        x = event.clientX - viewerRect.left;
        y = event.clientY - viewerRect.top;
        // console.log('onResizeStart', `event.clientX: ${x}, event.clientY: ${y}`);

        document.addEventListener("mousemove", onResize);
        document.addEventListener("mouseup", onResizeEnd);
    };

    const onResize = (event: globalThis.MouseEvent) => {
        // console.log('onResize', `event.clientX: ${event.clientX}, event.clientY: ${event.clientY}`);
        if (!pdfCanvasRef?.current) return;
        const viewerRect = pdfCanvasRef.current.getBoundingClientRect();
        const mx = event.clientX - viewerRect.left;
        const my = event.clientY - viewerRect.top;

        console.log(`mx: ${mx}, my: ${my}`);
        console.log('onResizeStart', `event.clientX: ${x}, event.clientY: ${y}`);
        const cx = mx - x;
        const cy = my - y;
        setSignatureBoxSize({
            boxH: Math.min(200, Math.max(25, cy + signatureBoxSize.boxH)),
            boxW: Math.min(300, Math.max(60, cx + signatureBoxSize.boxW))
        });
    }

    const onResizeEnd = () => {
        document.removeEventListener("mousemove", onResize);
        document.removeEventListener("mouseup", onResizeEnd);
    };

    // const onSignBoxHeight = (event: any) => {
    //     const value = event.target.value;
    //     setSignatureBoxSize((prev: any) => ({ ...prev, boxH: value }));
    // }

    // const onSignBoxWidth = (event: any) => {
    //     const value = event.target.value;
    //     setSignatureBoxSize((prev: any) => ({ ...prev, boxW: value }));
    // }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setPdfFile(files[0]);
    }

    const onDocumentLoadSuccess = (pdf: DocumentCallback) => {
        setNumPages(pdf?.numPages);
        setPageNumber(1);
    }

    const handleField = (button: IFieldButton) => {
        setSignatureBoxPosition({
            posX: 0,
            posY: 0,
            x: button.positionX,
            y: button.positionY
        });
        setSignatureBoxSize({
            boxH: button.height,
            boxW: button.width
        });
        setSignatureBox({ fieldName: button.fieldName, fieldType: button.fieldType });
        setFieldBox(true);
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
            signatureBox.fieldName,
            signatureBoxPosition.posX,
            signatureBoxPosition.posY,
            signatureBoxSize.boxH,
            signatureBoxSize.boxW
        );
        setFields((prev: IFieldDetails[]) => [...prev, {
            id: fieldId,
            fieldName: signatureBox.fieldName,
            fieldType: signatureBox.fieldType,
            positionX: signatureBoxPosition.posX,
            positionY: signatureBoxPosition.posY,
            width: signatureBoxSize.boxW,
            height: signatureBoxSize.boxH,
            pageNumber: pageNumber
        }]);
        setFieldBox(false);
    }

    const onSubmit = () => {
        const pdfFileName = pdfFile instanceof File ? pdfFile.name : urlToFileName(pdfFile);
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
                                {fieldBox && (
                                    <button onClick={() => setFieldBox(false)} >
                                        Canel Field
                                    </button>
                                )}
                                {!fieldBox && fieldButtons.map((button: IFieldButton, index: number) => (
                                    <button key={index} onClick={() => handleField(button)} style={{ margin: 10 }}>
                                        Add {button.fieldName}
                                    </button>
                                ))}
                                <button onClick={onSubmit} style={{ margin: 10 }}>
                                    Save
                                </button>
                                {fieldBox && (
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
                                        {/* <label htmlFor="">Hight</label>
                                        <input type="number" value={signatureBoxSize.boxH} id="" onChange={onSignBoxHeight} />
                                        <label htmlFor="">Width</label>
                                        <input type="number" value={signatureBoxSize.boxW} id="" onChange={onSignBoxWidth} /> */}
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
                                    loading={<span>Loading...</span>}
                                >
                                    <Page
                                        className={'page-container'}
                                        pageNumber={pageNumber}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        onClick={handleRemoveSignatureBox}
                                    >
                                        {fieldBox && (
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
                                                    <div
                                                        style={{
                                                            width: signatureBoxSize.boxW + 'px',
                                                            height: signatureBoxSize.boxH + 'px',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {signatureBox.fieldName}
                                                        <div
                                                            className="resize"
                                                            style={{
                                                                width: '10px',
                                                                height: '10px',
                                                                borderRadius: '50%',
                                                                position: 'absolute',
                                                                backgroundColor: 'rgba(0, 0, 255, 0.6)',
                                                                cursor: 'nw-resize',
                                                                bottom: -5,
                                                                right: -5,
                                                                zIndex: 15
                                                            }}
                                                            onMouseDown={onResizeStart}
                                                        ></div>
                                                    </div>
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
