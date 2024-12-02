import { MouseEvent, useEffect, useRef, useState } from "react";
import { createRoot } from 'react-dom/client';
import Draggable, { DraggableEvent } from "react-draggable";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { ImCross } from "react-icons/im";
import { IoMdCheckboxOutline } from "react-icons/io";
import { MdOutlineDragIndicator } from "react-icons/md";
import { Document, Page } from "react-pdf";
import { DocumentCallback } from "react-pdf/src/shared/types.js";
import { useNavigate } from "react-router-dom";
import { fieldButtons } from "../helper/docSignature";
import { generateAdminCheckField, generateAdminField } from "../helper/htmlStrings";
import { IFieldButton, IFieldData, IFieldDetails, ISignaturePosition, ISignatureSize } from "../helper/interface";
import { generateUid, urlToFileName } from "../helper/utils";
import '../pdf-worker.config';

interface IProps {
    handleSendToUser: (pdfFile: File) => void;
}

const AdminPanel = ({ handleSendToUser }: IProps) => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState<File | string>('https://cdn.filestackcontent.com/wcrjf9qPTCKXV3hMXDwK');
    const [numPages, setNumPages] = useState<number>(0);
    const [fieldsContainerPos, setFieldsContainerPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    const [fields, setFields] = useState<IFieldDetails[]>([]);

    const [signatureBox, setSignatureBox] = useState<{ fieldName: string, fieldType: string }>({ fieldName: '', fieldType: '' });
    const [signatureBoxPosition, setSignatureBoxPosition] = useState<ISignaturePosition>({ x: 0, y: -300, posX: 0, posY: 0 });
    const [signatureBoxSize, setSignatureBoxSize] = useState<ISignatureSize>({ boxH: 50, boxW: 100 });
    const [indx, setIndx] = useState<number>(0);

    const [dragStatus, setDragStatus] = useState<'start' | 'drop' | 'done'>('done');
    const [fieldBox, setFieldBox] = useState<boolean>(false);
    const pdfCanvasRef = useRef<HTMLDivElement>(null);
    const fieldsRef = useRef<IFieldDetails[]>(fields);

    const drawField = (field: IFieldData) => {
        if (field?.viewerElement)
            field.viewerElement.style.position = 'relative';
        if (field?.viewerElement) {
            if (field?.fieldType == 'CHECKBOX') {
                field?.viewerElement.insertAdjacentHTML('beforeend', generateAdminCheckField(field));
                const checkBoxField = document?.getElementById(`${field?.id}`) as HTMLElement;
                if (checkBoxField) {
                    const checkboxElement = document.createElement("div");
                    checkboxElement.id = field?.id;
                    checkBoxField.appendChild(checkboxElement);
                    const root = createRoot(checkboxElement);
                    root.render(<IoMdCheckboxOutline id={`${field?.id}`} />);
                }
            } else {
                field?.viewerElement.insertAdjacentHTML('beforeend', generateAdminField(field));
            }
            const deleteDiv = document?.querySelector(`.delete-${field?.id}`) as HTMLElement;
            const resizeDiv = document?.querySelector(`.resize-${field?.id}`) as HTMLElement;
            const reqDiv = document?.querySelector(`#check-${field?.id}`) as HTMLInputElement;
            if (deleteDiv) {
                const root = createRoot(deleteDiv);
                root.render(<div><ImCross /></div>);
                deleteDiv.onclick = () => onDeleteField(field?.id as string);
            }
            if (resizeDiv) {
                const root = createRoot(resizeDiv);
                root.render(<div><FaRegArrowAltCircleRight /></div>);
                resizeDiv.onmousedown = (e) => onResizeStart(e, field?.id as string);
            }
            if (reqDiv) {
                const root = createRoot(reqDiv);
                root.render(<div><MdOutlineDragIndicator /></div>);
                reqDiv.onchange = () => onFieldRequest(field?.id as string, reqDiv?.checked);
            }
        }
    }

    const removeField = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.remove();
        }
    }

    const onFieldRequest = (id: string, checked: boolean) => {
        const currentFields = fieldsRef.current;
        const requiredStar = document.querySelector(`.star-${id}`) as HTMLElement;
        if (requiredStar)
            requiredStar.style.display = checked ? 'inline' : 'none';
        setFields(currentFields.map(field => field.id === id ? { ...field, required: checked } : field));
    }

    const onDragStart = (event: MouseEvent | DraggableEvent) => {
        setFieldBox(true);
        setDragStatus('start');
        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = (event as MouseEvent).clientX - pdfContainer?.left;
        const dataY = (event as MouseEvent).clientY - pdfContainer?.bottom;
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
        const dataX = event?.clientX - pdfContainer.left;
        const dataY = event?.clientY - pdfContainer.bottom;
        const cord = {
            x: dataX,
            y: dataY,
            posX: event.clientX,
            posY: event.clientY
        }
        setSignatureBoxPosition(cord);
    }

    const onDragEnd = () => {
        setDragStatus('drop');
        document.removeEventListener('mousedown', onDragStart);
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
    }

    const onDeleteField = (id: string) => {
        const currentFields = fieldsRef.current;
        if (currentFields.some((field) => field.id == id)) {
            removeField(id);
            setFields(currentFields.filter(field => field.id !== id));
        }
    }

    let x: number, y: number, w: number, h: number;
    const onResizeStart = (event: globalThis.MouseEvent, id: string) => {
        event.stopPropagation();

        const fieldElement = document.getElementById(id) as HTMLElement;
        const viewerRect = fieldElement.getBoundingClientRect();
        x = event.clientX - viewerRect.left;
        y = event.clientY - viewerRect.top;
        w = fieldElement.clientWidth;
        h = fieldElement.clientHeight;
        const handleMouseMove = (e: globalThis.MouseEvent) => onResize(e, id);
        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const onResize = (event: globalThis.MouseEvent, id: string) => {
        const currentFields = fieldsRef.current;
        const fieldElement = document.getElementById(id) as HTMLElement;
        const viewerRect = fieldElement.getBoundingClientRect();
        const mx = event.clientX - viewerRect.left;
        const my = event.clientY - viewerRect.top;
        const field = currentFields.find((field) => field.id === id);
        if (field) {
            const viewerElement = pdfCanvasRef?.current?.querySelectorAll('.page-container')[field?.pageNumber] as HTMLElement;
            const viewRect = viewerElement?.getBoundingClientRect();
            const pageHeight = viewRect?.height;
            const pageWidth = viewRect?.width;
            const newWidthPx = Math.min(500, Math.max(25, mx - x + w));
            const newHeightPx = Math.min(400, Math.max(25, my - y + h));
            const newWidth = (newWidthPx / pageWidth) * 100;
            const newHeight = (newHeightPx / pageHeight) * 100;

            fieldElement.style.width = newWidth + "%";
            fieldElement.style.height = newHeight + "%";

            setFields(currentFields.map(field => field.id === id ? { ...field, width: newWidth, height: newHeight } : field));
        }
    }

    const onResizeEnd = (id: string) => {
        document.removeEventListener("mousemove", (e) => onResize(e, id));
        document.removeEventListener("mouseup", () => onResizeEnd(id));
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
        const field = fields.find((field) => field.id == divId);
        if (field) {
            const viewerElement = pdfCanvasRef?.current?.querySelectorAll('.page-container')[field?.pageNumber] as HTMLElement;
            const viewRect = viewerElement?.getBoundingClientRect();
            const pageHeight = viewRect?.height;
            const pageWidth = viewRect?.width;
            removeField(divId ?? '');
            setFields(fields?.filter(field => field?.id !== divId));
            handleField({
                fieldName: field?.fieldName ?? '',
                fieldType: field?.fieldType ?? '',
                positionX: field?.positionX ?? 0,
                positionY: field?.positionY ?? 0,
                width: ((field?.width ?? 0) / 100) * pageWidth,
                height: ((field?.height ?? 0) / 100) * pageHeight,
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

    const handleClick = () => {
        console.log('fields #', fields);
    }

    useEffect(() => {
        if (dragStatus == 'drop') {
            const viewerElement = pdfCanvasRef?.current?.querySelectorAll('.page-container')[indx] as HTMLElement;
            const viewRect = viewerElement?.getBoundingClientRect();
            const posX = signatureBoxPosition.posX - viewRect?.left;
            const posY = signatureBoxPosition.posY - viewRect?.top;
            const pageHeight = viewRect?.height;
            const pageWidth = viewRect?.width;

            if (isSignatureBoxValid(posX, posY, pageWidth, pageHeight)) {
                const fieldId: string = generateUid();
                setFields((prev: IFieldDetails[]) => [...prev, {
                    id: fieldId,
                    fieldName: signatureBox.fieldName,
                    fieldType: signatureBox.fieldType,
                    positionX: (posX / viewRect?.width) * 100,
                    positionY: (posY / viewRect?.height) * 100,
                    width: (signatureBoxSize.boxW / pageWidth) * 100,
                    height: (signatureBoxSize.boxH / pageHeight) * 100,
                    pageNumber: indx,
                    required: false,
                    hasApplied: false
                }]);
                drawField({
                    id: fieldId,
                    fieldName: signatureBox.fieldName,
                    fieldType: signatureBox.fieldType,
                    posX: (posX / viewRect?.width) * 100,
                    posY: (posY / viewRect?.height) * 100,
                    width: (signatureBoxSize.boxW / pageWidth) * 100,
                    height: (signatureBoxSize.boxH / pageHeight) * 100,
                    viewerElement: viewerElement
                });
            }
            setDragStatus('done');
            setFieldBox(false);
        }
    }, [dragStatus]);

    useEffect(() => {
        fieldsRef.current = fields;
    }, [fields]);

    useEffect(() => {
        setTimeout(() => {
            const rightPosition = pdfCanvasRef?.current?.getBoundingClientRect().width ?? 0;
            setFieldsContainerPos({ x: rightPosition - 200, y: 10 });
        }, 100);
    }, [numPages]);
    return (
        <div>
            <h3>Admin Panel</h3>
            <input type="file" onChange={handleFileUpload} />
            <div className="document">
                {
                    pdfFile && (
                        <>
                            <div>
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
                                <Draggable
                                    handle=".handle"
                                    position={fieldsContainerPos}
                                    onDrag={(_, data) => setFieldsContainerPos(data)}
                                >
                                    <div style={{ position: 'fixed', zIndex: 10, cursor: "default", display: fieldsContainerPos.x > 0 ? '' : 'none' }}>
                                        <div style={{ display: 'inline-block', padding: '0px 10px', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0px 0px 10px #aaaaaa' }}>
                                            <div className="handle"><MdOutlineDragIndicator /></div>
                                            {fieldButtons.map((button: IFieldButton, index: number) => (
                                                <div key={index}>
                                                    <button key={index} onMouseDown={() => handleField(button)} style={{ margin: '5px 0px', width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        {button.icon} {button.fieldName}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Draggable>
                                <Document
                                    file={pdfFile}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={<span>Loading...</span>}
                                    onClick={handleClick}
                                >
                                    {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => {
                                        return (
                                            <>
                                                <Page
                                                    key={page}
                                                    width={1100}
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
                                                    zIndex: 20,
                                                    alignItems: '',
                                                    userSelect: 'none'
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: signatureBoxSize?.boxW + 'px',
                                                        height: signatureBoxSize?.boxH + 'px',
                                                        position: 'relative',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {signatureBox?.fieldType == 'CHECKBOX' ? <IoMdCheckboxOutline /> : signatureBox?.fieldName}
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
