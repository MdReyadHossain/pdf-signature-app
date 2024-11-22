import { MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { DraggableEvent } from "react-draggable";
import { Document, Page } from "react-pdf";
import { DocumentCallback } from "react-pdf/src/shared/types.js";
import { useNavigate } from "react-router-dom";
import { IFieldButton, IFieldData, IFieldDetails, ISignaturePosition, ISignatureSize } from "../helper/interface";
import { generateUid, urlToFileName } from "../helper/utils";
import '../pdf-worker.config';
import { fieldButtons } from "../helper/docSignature";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { TiDeleteOutline } from "react-icons/ti";

interface IProps {
    handleSendToUser: (pdfFile: File) => void;
}

const AdminPanel = ({ handleSendToUser }: IProps) => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState<File | string>('https://cdn.filestackcontent.com/wcrjf9qPTCKXV3hMXDwK');
    const [numPages, setNumPages] = useState<number>(0);

    const [fields, setFields] = useState<IFieldDetails[]>([]);

    const [signatureBox, setSignatureBox] = useState<{ fieldName: string, fieldType: string }>({ fieldName: '', fieldType: '' });
    const [signatureBoxPosition, setSignatureBoxPosition] = useState<ISignaturePosition>({ x: 0, y: -300, posX: 0, posY: 0 });
    const [signatureBoxSize, setSignatureBoxSize] = useState<ISignatureSize>({ boxH: 50, boxW: 100 });
    const [indx, setIndx] = useState<number>(-1);

    const [dragStatus, setDragStatus] = useState<'start' | 'drop' | 'done'>('done');
    const [fieldBox, setFieldBox] = useState<boolean>(false);
    const pdfCanvasRef = useRef<HTMLDivElement>(null);

    const drawField = (field: IFieldData) => {
        field.viewerElement.style.position = 'relative';
        if (field?.viewerElement) {
            const sealedSignatureDiv = document.createElement('div');
            sealedSignatureDiv.id = field?.id ?? '';
            sealedSignatureDiv.style.position = 'absolute';
            sealedSignatureDiv.style.left = `${field?.posX}px`;
            sealedSignatureDiv.style.top = `${field?.posY}px`;
            sealedSignatureDiv.style.width = field?.width + 'px';
            sealedSignatureDiv.style.height = field?.height + 'px';
            sealedSignatureDiv.style.backgroundColor = 'rgba(51, 204, 51, 0.2)';
            sealedSignatureDiv.style.border = '2px dashed green';
            sealedSignatureDiv.style.cursor = 'grab';
            sealedSignatureDiv.style.color = 'black';
            sealedSignatureDiv.style.display = 'flex';
            sealedSignatureDiv.style.justifyContent = 'center';
            sealedSignatureDiv.style.alignItems = 'center';
            sealedSignatureDiv.textContent = field?.fieldName ?? 'Field';

            field?.viewerElement.appendChild(sealedSignatureDiv);
        }
    }

    const removeField = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    const onDragStart = (event: MouseEvent | DraggableEvent) => {
        setFieldBox(true);
        setDragStatus('start');
        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = (event as MouseEvent).clientX - pdfContainer.left;
        const dataY = (event as MouseEvent).clientY - pdfContainer.bottom;

        setSignatureBoxPosition({
            posX: (event as MouseEvent).clientX,
            posY: (event as MouseEvent).clientY,
            x: dataX,
            y: dataY
        });
    }

    const onDrag = (event: globalThis.MouseEvent) => {
        const target = event.target as HTMLElement;
        const pageContainers = document.querySelectorAll('.page-container');

        const closestContainer = target.closest('.page-container') as HTMLElement;

        if (closestContainer) {
            pageContainers.forEach((container, idx) => {
                if (container === closestContainer) {
                    setIndx(idx);
                }
            });
        }
        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = event.clientX - pdfContainer.left;
        const dataY = event.clientY - pdfContainer.bottom;
        const cord = {
            x: dataX,
            y: dataY,
            posX: event.clientX,
            posY: event.clientY
        }
        console.log('setSignatureBoxPosition #', cord);
        setSignatureBoxPosition(cord);
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

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        setPdfFile(files[0]);
    }

    const onDocumentLoadSuccess = (pdf: DocumentCallback) => {
        setNumPages(pdf?.numPages);
    }

    const handleField = (button: IFieldButton) => {
        setSignatureBoxSize({
            boxH: button.height,
            boxW: button.width
        });
        setSignatureBox({ fieldName: button.fieldName, fieldType: button.fieldType });

        document.addEventListener('mousedown', onDragStart);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    }

    const handleMoveFieldBox = (event: MouseEvent) => {
        const divId = (event.target as HTMLElement)?.id;
        const field = fields.find((field) => field.id === divId);
        if (fields.some(field => field.id == divId)) {
            removeField(divId);
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

    const onSubmit = () => {
        const pdfFileName = pdfFile instanceof File ? pdfFile.name : urlToFileName(pdfFile);
        if (pdfFileName) {
            localStorage.setItem(pdfFileName, JSON.stringify(fields));
        }
        handleSendToUser(pdfFile as File);
        navigate('/user');
    }

    const isSignatureBoxValid = (posX: number, posY: number, pageWidth: number, pageHeight: number) => {
        return !(posX < 0 || posX + signatureBoxSize.boxW > pageWidth
            || posY < 0 || posY + signatureBoxSize.boxH > pageHeight
            || signatureBoxSize.boxH <= 0 || signatureBoxSize.boxW <= 0);
    }

    useEffect(() => {
        if (dragStatus == 'drop') {
            const viewerElement = pdfCanvasRef?.current?.querySelectorAll('.page-container')[indx] as HTMLElement;
            const viewRect = viewerElement.getBoundingClientRect();
            const posX = signatureBoxPosition.posX - viewRect?.left;
            const posY = signatureBoxPosition.posY - viewRect?.top;
            const pageHeight = viewRect?.height;
            const pageWidth = viewRect?.width;
            
            if (isSignatureBoxValid(posX, posY, pageWidth, pageHeight)) {
                const fieldId: string = `field-${generateUid()}`;
                drawField({
                    id: fieldId,
                    fieldName: signatureBox.fieldName,
                    posX: signatureBoxPosition.posX - viewRect?.left,
                    posY: signatureBoxPosition.posY - viewRect?.top,
                    height: signatureBoxSize.boxH,
                    width: signatureBoxSize.boxW,
                    viewerElement: viewerElement
                });
                setFields((prev: IFieldDetails[]) => [...prev, {
                    id: fieldId,
                    fieldName: signatureBox.fieldName,
                    fieldType: signatureBox.fieldType,
                    positionX: signatureBoxPosition.posX,
                    positionY: signatureBoxPosition.posY,
                    width: signatureBoxSize.boxW,
                    height: signatureBoxSize.boxH,
                    pageNumber: indx
                }]);
            }
            setDragStatus('done');
            setFieldBox(false);
        }
    }, [dragStatus])
    return (
        <div>
            <div className="div">
                <div className="child-div-1">
                    <div className="child-1"></div>
                </div>
                <div className="child-div-2">
                    <div className="child-2"></div>
                </div>
                <div className="child-div-3">
                    <div className="child-3"></div>
                </div>
            </div>


            <h3>Admin Panel</h3>
            <input type="file" onChange={handleFileUpload} />
            <div style={{ position: 'fixed', zIndex: 50 }}>
                <Draggable
                    handle=".handle"
                    defaultPosition={{ x: 0, y: 0 }}
                >
                    <div style={{ display: 'inline-block', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0px 0px 10px #aaaaaa' }}>
                        <div className="handle" style={{ color: 'black', cursor: '' }}>Drag</div>
                        {fieldButtons.map((button: IFieldButton, index: number) => (
                            <div key={index}>
                                <button key={index} onMouseDown={() => handleField(button)} style={{ margin: 10 }}>
                                    Add {button.fieldName}
                                </button>
                            </div>
                        ))}
                    </div>
                </Draggable>
            </div>
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
                                    // onClick={handleClick}
                                    loading={<span>Loading...</span>}
                                >
                                    {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => {
                                        return (<>
                                            <Page
                                                key={page}
                                                scale={1}
                                                width={1000}
                                                className={'page-container page-number-' + page}
                                                pageNumber={page}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                onMouseDown={handleMoveFieldBox}
                                            >
                                            </Page>
                                            <div style={{ height: 10 }}></div>
                                        </>
                                        );
                                    })}
                                    {fieldBox && (
                                        <Draggable
                                            position={signatureBoxPosition}
                                            onStart={onDragStart}
                                            onDrag={onDrag as any}
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
                                                    transition: 'linear 0.5s ease-out',
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
                                </Document>
                            </div>
                        </>
                    )
                }
            </div>
        </div>
    )
}

export default AdminPanel
