import { MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { DraggableEvent } from "react-draggable";
import { Document, Page } from "react-pdf";
import { DocumentCallback } from "react-pdf/src/shared/types.js";
import { useNavigate } from "react-router-dom";
import { IFieldButton, IFieldDetails, ISignaturePosition, ISignatureSize } from "../helper/interface";
import { generateUid, urlToFileName } from "../helper/utils";
import '../pdf-worker.config';
import { fieldButtons } from "../helper/docSignature";
import { FiArrowDownRight } from "react-icons/fi";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { TiDeleteOutline } from "react-icons/ti";

interface IProps {
    handleSendToUser: (pdfFile: File) => void;
}

const AdminPanel = ({ handleSendToUser }: IProps) => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState<File | string>('https://cdn.filestackcontent.com/wcrjf9qPTCKXV3hMXDwK');
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(0);
    const [pdfSize, setPdfSize] = useState<{ h: number, w: number }>({ h: 0, w: 0 });

    const [fields, setFields] = useState<IFieldDetails[]>([]);

    const [signatureBox, setSignatureBox] = useState<{ fieldName: string, fieldType: string }>({ fieldName: '', fieldType: '' });
    const [signatureBoxPosition, setSignatureBoxPosition] = useState<ISignaturePosition>({ x: 0, y: -300, posX: 0, posY: 0 });
    const [signatureBoxSize, setSignatureBoxSize] = useState<ISignatureSize>({ boxH: 50, boxW: 100 });

    const [dragStatus, setDragStatus] = useState<'start' | 'drop' | 'done'>('done');
    const [fieldBox, setFieldBox] = useState<boolean>(false);
    const pdfCanvasRef = useRef<HTMLDivElement>(null);

    const drawSignatureField = (id: string, fieldName: string, posX: number, posY: number, height: number, width: number) => {
        const viewerElement = pdfCanvasRef?.current?.querySelector('.page-container') as HTMLElement;
        viewerElement.style.position = 'relative';
        if (viewerElement) {
            console.log('signatureBoxPosition #', posX, posY);

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

    const onDragStart = (event: MouseEvent | DraggableEvent) => {
        setFieldBox(true);
        setDragStatus('start');
        console.log('start');
        // const target = event.target as HTMLElement;
        // if (target && target.classList.contains('resize')) {
        //     event.stopPropagation();
        //     return;
        // }
        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = (event as MouseEvent).clientX - pdfContainer.left;
        const dataY = (event as MouseEvent).clientY - pdfContainer.bottom;

        // setFields((prev: IFieldDetails[]) => prev.map(field => field.id === fieldId ? {
        //     ...field,
        //     positionX: dataX,
        //     positionY: dataY
        // } : field));
        // Update the signatureBoxPosition to set the element at the mouse pointer's position
        setSignatureBoxPosition({
            posX: dataX,
            posY: dataY,
            x: dataX,
            y: dataY
        });
    }

    const onDrag = (event: any) => {
        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = (event as MouseEvent).clientX - pdfContainer.left;
        const dataY = (event as MouseEvent).clientY - pdfContainer.bottom;

        // Update the signatureBoxPosition to set the element at the mouse pointer's position
        // setFields((prev: IFieldDetails[]) => prev.map(field => field.id === fieldId ? {
        //     ...field,
        //     positionX: dataX,
        //     positionY: dataY
        // } : field));
        // setSignatureBoxPosition({
        //     posX: dataX,
        //     posY: dataY,
        //     x: dataX,
        //     y: dataY
        // });
        if (!pdfCanvasRef?.current) return;
        const viewerRect = pdfCanvasRef.current.getBoundingClientRect();
        const pdfX = event.clientX - viewerRect.left;
        const pdfY = event.clientY - viewerRect.top;
        const cord = {
            x: dataX,
            y: dataY,
            posX: pdfX,
            posY: pdfY
        }
        console.log(cord);
        setSignatureBoxPosition(cord);
        console.log('signatureBox #', signatureBox);
        console.log('signatureBoxPosition #', signatureBoxPosition);
        console.log('signatureBoxSize #', signatureBoxSize);
    }

    const onDragEnd = () => {
        setDragStatus('drop');
        console.log('drop');
        document.removeEventListener('mousedown', onDragStart);
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
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
        // setSignatureBoxPosition({
        //     posX: 0,
        //     posY: 0,
        //     x: button.positionX,
        //     y: button.positionY
        // });
        setSignatureBoxSize({
            boxH: button.height,
            boxW: button.width
        });
        setSignatureBox({ fieldName: button.fieldName, fieldType: button.fieldType });

        document.addEventListener('mousedown', onDragStart);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
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

    const handleMoveFieldBox = (event: MouseEvent) => {
        const divId = (event.target as HTMLElement)?.id;
        const field = fields.find((field) => field.id === divId);
        if (fields.some(field => field.id == divId)) {
            removeSignatureField(divId);
            setFields(fields.filter(field => field.id !== divId));
            handleField({
                fieldName: field?.fieldName ?? '',
                fieldType: field?.fieldType ?? '',
                positionX: field?.positionX ?? 0,
                positionY: field?.positionY ?? 0,
                width: field?.width ?? 0,
                height: field?.height ?? 0,
            })
        }
    }

    const handleSetFieldBox = () => {
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

    console.log('pdfSize #', pdfSize);

    const isSignatureBoxValid = () => {
        return !(signatureBoxPosition.posX < 0 || signatureBoxPosition.posX + signatureBoxSize.boxW > pdfSize.w
            || signatureBoxPosition.posY < 0 || signatureBoxPosition.posY + signatureBoxSize.boxH > pdfSize.h
            || signatureBoxSize.boxH <= 0 || signatureBoxSize.boxW <= 0
            || !pdfCanvasRef?.current
            || !pdfCanvasRef.current.getBoundingClientRect());
    }

    useEffect(() => {
        if (dragStatus == 'drop') {
            console.log('signatureBox #', signatureBox);
            console.log('signatureBoxPosition #', signatureBoxPosition);
            console.log('signatureBoxSize #', signatureBoxSize);
            if (isSignatureBoxValid()) {
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
            }
            setDragStatus('done');
            setFieldBox(false);
        }
    }, [dragStatus])

    useEffect(() => {
        setTimeout(() => {
            const pdfCanvas = document?.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
            console.log('pdfCanvas #', pdfCanvas);
            setPdfSize({
                h: parseInt(pdfCanvas?.style?.height, 10),
                w: parseInt(pdfCanvas?.style?.width, 10)
            });
        }, 500);
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
                                {/* {fieldBox && (
                                    <button onClick={() => setFieldBox(false)} >
                                        Canel Field
                                    </button>
                                )} */}
                                {fieldButtons.map((button: IFieldButton, index: number) => (
                                    <button key={index} onMouseDown={() => handleField(button)} style={{ margin: 10 }}>
                                        Add {button.fieldName}
                                    </button>
                                ))}
                                <button onClick={onSubmit} style={{ margin: 10 }}>
                                    Save
                                </button>

                            </div>
                            <div
                                className="pdf-container"
                                ref={pdfCanvasRef}
                                style={{
                                    width: 'auto',
                                    display: 'inline-block',
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
                                        onMouseDown={handleMoveFieldBox}
                                    >
                                        {fieldBox && (
                                            <Draggable
                                                position={signatureBoxPosition}
                                                onStart={onDragStart}
                                                onDrag={onDrag}
                                            // bounds='parent'
                                            >
                                                <div
                                                    style={{
                                                        width: signatureBoxSize?.boxW + 'px',
                                                        height: signatureBoxSize?.boxH + 'px',
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
                                                            width: signatureBoxSize?.boxW + 'px',
                                                            height: signatureBoxSize?.boxH + 'px',
                                                            position: 'relative',
                                                        }}
                                                    >
                                                        {signatureBox?.fieldName}
                                                        <div
                                                            className="resize"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                borderRadius: '50%',
                                                                position: 'absolute',
                                                                backgroundColor: 'rgba(255, 0, 0)',
                                                                color: 'white',
                                                                cursor: 'default',
                                                                top: -5,
                                                                right: -10,
                                                                zIndex: 15
                                                            }}
                                                            onMouseDown={onResizeStart}
                                                        ><TiDeleteOutline /></div>
                                                        <div
                                                            className="resize"
                                                            style={{
                                                                width: '15px',
                                                                height: '15px',
                                                                position: 'absolute',
                                                                cursor: 'nw-resize',
                                                                bottom: -5,
                                                                right: -10,
                                                                zIndex: 15,
                                                                transform: 'rotate(45deg)',
                                                                backgroundColor: 'white',
                                                                borderRadius: '50%'
                                                            }}
                                                            onMouseDown={onResizeStart}
                                                        ><FaRegArrowAltCircleRight /></div>
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
