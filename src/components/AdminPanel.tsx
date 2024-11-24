import { MouseEvent, useEffect, useRef, useState } from "react";
import Draggable, { DraggableEvent } from "react-draggable";
import { Document, Page } from "react-pdf";
import { DocumentCallback } from "react-pdf/src/shared/types.js";
import { useNavigate } from "react-router-dom";
import { IFieldButton, IFieldData, IFieldDetails, ISignaturePosition, ISignatureSize } from "../helper/interface";
import { generateUid, urlToFileName } from "../helper/utils";
import '../pdf-worker.config';
import { fieldButtons } from "../helper/docSignature";
import { FiArrowDownRight } from "react-icons/fi";
import { FaRegArrowAltCircleRight } from "react-icons/fa";
import { TiDeleteOutline } from "react-icons/ti";
import ReactDOM from "react-dom";
import { ImCross } from "react-icons/im";

interface IProps {
    handleSendToUser: (pdfFile: File) => void;
}

const AdminPanel = ({ handleSendToUser }: IProps) => {
    const navigate = useNavigate();
    const [pdfFile, setPdfFile] = useState<File | string>('https://cdn.filestackcontent.com/wcrjf9qPTCKXV3hMXDwK');
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(0);
    const [fieldsContainerPos, setFieldsContainerPos] = useState<{ x: number, y: number }>({ x: 0, y: 0 });

    const [fields, setFields] = useState<IFieldDetails[]>([]);

    const [signatureBox, setSignatureBox] = useState<{ fieldName: string, fieldType: string }>({ fieldName: '', fieldType: '' });
    const [signatureBoxPosition, setSignatureBoxPosition] = useState<ISignaturePosition>({ x: 0, y: -300, posX: 0, posY: 0 });
    const [signatureBoxSize, setSignatureBoxSize] = useState<ISignatureSize>({ boxH: 50, boxW: 100 });
    const [indx, setIndx] = useState<number>(-1);

    const [dragStatus, setDragStatus] = useState<'start' | 'drop' | 'done'>('done');
    const [fieldBox, setFieldBox] = useState<boolean>(false);
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
                            width: ${field?.width}px;
                            height: ${field?.height}px;
                            background-color: rgba(51, 204, 51, 0.2);
                            border: 2px dashed green;
                            cursor: grab;
                            color: black;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        ">
                        ${field?.fieldName ?? 'Field'}
                        <div 
                            class="delete-${field?.id}" 
                            style="
                                width: 15px;
                                height: 15px;
                                border-radius: 50%;
                                border: 1px solid black;
                                position: absolute;
                                background-color: rgba(255, 0, 0);
                                color: white;
                                cursor: pointer;
                                top: -10px;
                                right: -10px;
                                font-size: 10px;
                                z-index: 15;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                            "
                        ></div>
                        <div 
                            class="resize-${field?.id}" 
                            style="
                                width: 15px;
                                height: 15px;
                                border-radius: 50%;
                                position: absolute;
                                background-color: white;
                                cursor: nw-resize;
                                bottom: -10px;
                                right: -10px;
                                z-index: 15;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                transform: rotate(45deg);
                            "
                        ></div>
                    </div>
                `;
            // const sealedSignatureDiv = document.createElement('div');
            // sealedSignatureDiv.id = field?.id ?? '';
            // sealedSignatureDiv.style.position = 'absolute';
            // sealedSignatureDiv.style.left = `${field?.posX}px`;
            // sealedSignatureDiv.style.top = `${field?.posY}px`;
            // sealedSignatureDiv.style.width = field?.width + 'px';
            // sealedSignatureDiv.style.height = field?.height + 'px';
            // sealedSignatureDiv.style.backgroundColor = 'rgba(51, 204, 51, 0.2)';
            // sealedSignatureDiv.style.border = '2px dashed green';
            // sealedSignatureDiv.style.cursor = 'grab';
            // sealedSignatureDiv.style.color = 'black';
            // sealedSignatureDiv.style.display = 'flex';
            // sealedSignatureDiv.style.justifyContent = 'center';
            // sealedSignatureDiv.style.alignItems = 'center';
            // sealedSignatureDiv.textContent = field?.fieldName ?? 'Field';

            // const deleteDiv = document.createElement('div');
            // deleteDiv.className = 'delete';
            // deleteDiv.style.width = '20px';
            // deleteDiv.style.height = '20px';
            // deleteDiv.style.borderRadius = '50%';
            // deleteDiv.style.position = 'absolute';
            // deleteDiv.style.backgroundColor = 'rgba(255, 0, 0)';
            // deleteDiv.style.color = 'white';
            // deleteDiv.style.cursor = 'default';
            // deleteDiv.style.top = '-10px';
            // deleteDiv.style.right = '-10px';
            // deleteDiv.style.zIndex = '15';
            // deleteDiv.style.display = 'flex';
            // deleteDiv.style.justifyContent = 'center';
            // deleteDiv.style.alignItems = 'center';
            // // deleteDiv.innerHTML = 'a';
            // deleteDiv.innerHTML = '&#x2716;';
            // // deleteDiv.onmousedown = onDeleteField;
            // sealedSignatureDiv.appendChild(deleteDiv);

            // const resizeDiv = document.createElement('div');
            // resizeDiv.className = 'resize';
            // resizeDiv.style.width = '15px';
            // resizeDiv.style.height = '15px';
            // resizeDiv.style.borderRadius = '50%';
            // resizeDiv.style.border = '1px solid black';
            // resizeDiv.style.position = 'absolute';
            // resizeDiv.style.backgroundColor = 'white';
            // resizeDiv.style.cursor = 'nw-resize';
            // resizeDiv.style.bottom = '-10px';
            // resizeDiv.style.right = '-10px';
            // resizeDiv.style.zIndex = '15';
            // resizeDiv.style.display = 'flex';
            // resizeDiv.style.justifyContent = 'center';
            // resizeDiv.style.alignItems = 'center';
            // resizeDiv.style.transform = 'rotate(45deg)';
            // // resizeDiv.innerHTML = 'a';
            // resizeDiv.innerHTML = '&rarr;';
            // // resizeDiv.onmousedown = onDeleteField;
            // sealedSignatureDiv.appendChild(resizeDiv);
            field?.viewerElement.insertAdjacentHTML('beforeend', htmlString);
            const deleteDiv = document?.querySelector(`.delete-${field?.id}`) as HTMLElement;
            const resizeDiv = document?.querySelector(`.resize-${field?.id}`) as HTMLElement;

            if (deleteDiv) {
                ReactDOM.render(<ImCross />, deleteDiv);
                deleteDiv.onclick = () => onDeleteField(field?.id as string);
            }
            if (resizeDiv) {
                ReactDOM.render(<FaRegArrowAltCircleRight />, resizeDiv);
                resizeDiv.onmousedown = (e) => onResizeStart(e, field?.id as string);
            }
            // field?.viewerElement.appendChild(sealedSignatureDiv);
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
            posX: (event as MouseEvent).clientX,
            posY: (event as MouseEvent).clientY,
            x: dataX,
            y: dataY
        });
    }

    const onDrag = (event: globalThis.MouseEvent) => {
        const target = event.target as HTMLElement;
        const pageContainers = document.querySelectorAll('.page-container');

        // Find the nearest .page-container from the event target
        const closestContainer = target.closest('.page-container') as HTMLElement;

        let index = -1; // Default: target not found within any .page-container

        if (closestContainer) {
            // Find the index of the closest .page-container
            pageContainers.forEach((container, idx) => {
                if (container === closestContainer) {
                    setIndx(idx);
                    index = idx;
                }
            });
        }

        console.log('onDrag Target Index:', index);

        const pdfContainer: DOMRect = pdfCanvasRef?.current?.getBoundingClientRect() as DOMRect;
        const dataX = event.clientX - pdfContainer.left;
        const dataY = event.clientY - pdfContainer.bottom;

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
        const viewerRect = pdfCanvasRef?.current?.querySelectorAll('.page-container')[index]?.getBoundingClientRect() as DOMRect;
        const pdfX = event.clientX - viewerRect?.left;
        const pdfY = event.clientY - viewerRect?.top;
        const cord = {
            x: dataX,
            y: dataY,
            posX: event.clientX,
            posY: event.clientY
        }
        console.log('setSignatureBoxPosition #', cord);
        setSignatureBoxPosition(cord);
        // console.log('signatureBox #', signatureBox);
        // console.log('signatureBoxPosition #', signatureBoxPosition);
        // console.log('signatureBoxSize #', signatureBoxSize);
    }

    const onDragEnd = () => {
        setDragStatus('drop');
        console.log('drop');
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
        // if (!pdfCanvasRef?.current) return;
        // console.log('onResizeStart', `event.clientX: ${event.clientX}, event.clientY: ${event.clientY}`);

        // const viewerRect = pdfCanvasRef.current.getBoundingClientRect();
        console.log('document.getElementById(id) #', document.getElementById(id));
        const fieldElement = document.getElementById(id) as HTMLElement
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

        // Attach event listeners
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const onResize = (event: globalThis.MouseEvent, id: string) => {
        // console.log('onResize', `event.clientX: ${event.clientX}, event.clientY: ${event.clientY}`);
        // if (!pdfCanvasRef?.current) return;
        // const viewerRect = pdfCanvasRef.current.getBoundingClientRect();
        const fieldElement = document.getElementById(id) as HTMLElement;
        const viewerRect = fieldElement.getBoundingClientRect();
        const mx = event.clientX - viewerRect.left;
        const my = event.clientY - viewerRect.top;
        // console.log('fieldElement #', fieldElement);
        // console.log(`mx: ${mx}, my: ${my}`);
        // console.log('onResizeStart', `event.clientX: ${x}, event.clientY: ${y}`);

        const newWidth = Math.min(300, Math.max(60, mx - x + w)); // Ensure minimum width
        const newHeight = Math.min(200, Math.max(25, my - y + h)); // Ensure minimum height

        fieldElement.style.width = newWidth + "px";
        fieldElement.style.height = newHeight + "px";

        const currentFields = fieldsRef.current;
        setFields(currentFields.map(field => field.id === id ? { ...field, width: newWidth, height: newHeight } : field));
        // setSignatureBoxSize({
        //     boxH: Math.min(200, Math.max(25, cy + signatureBoxSize.boxH)),
        //     boxW: Math.min(300, Math.max(60, cx + signatureBoxSize.boxW))
        // });
    }

    const onResizeEnd = (id: string) => {
        document.removeEventListener("mousemove", (e) => onResize(e, id));
        document.removeEventListener("mouseup", () => onResizeEnd(id));
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
        // if (pdfCanvasRef?.current) {
        //     const viewerRect = pdfCanvasRef.current.getBoundingClientRect();

        //     const pdfX = event.clientX - viewerRect.left;
        //     const pdfY = event.clientY - viewerRect.top;
        //     console.log(`x: ${Math.floor(pdfX)}, y: ${Math.floor(pdfY)}`);
        //     console.log('page-number: ', pageNumber);
        // }
        // console.log('signatureBoxPosition #', signatureBoxPosition);
        console.log('fields #', fields);
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

    // const handleSetFieldBox = () => {
    //     const fieldId: string = `field-${generateUid()}`;
    //     drawField({
    //         id: fieldId,
    //         fieldName: signatureBox.fieldName,
    //         posX: signatureBoxPosition.posX,
    //         posY: signatureBoxPosition.posY,
    //         height: signatureBoxSize.boxH,
    //         width: signatureBoxSize.boxW
    //     });
    //     setFields((prev: IFieldDetails[]) => [...prev, {
    //         id: fieldId,
    //         fieldName: signatureBox.fieldName,
    //         fieldType: signatureBox.fieldType,
    //         positionX: signatureBoxPosition.posX,
    //         positionY: signatureBoxPosition.posY,
    //         width: signatureBoxSize.boxW,
    //         height: signatureBoxSize.boxH,
    //         pageNumber: pageNumber
    //     }]);
    //     setFieldBox(false);
    // }

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
            const viewRect = viewerElement?.getBoundingClientRect();
            const posX = signatureBoxPosition.posX - viewRect?.left;
            const posY = signatureBoxPosition.posY - viewRect?.top;
            const pageHeight = viewRect?.height;
            const pageWidth = viewRect?.width;

            if (isSignatureBoxValid(posX, posY, pageWidth, pageHeight)) {
                const fieldId: string = `field-${generateUid()}`;
                setFields((prev: IFieldDetails[]) => [...prev, {
                    id: fieldId,
                    fieldName: signatureBox.fieldName,
                    fieldType: signatureBox.fieldType,
                    positionX: (posX / viewRect.width) * 100,
                    positionY: (posY / viewRect.height) * 100,
                    width: signatureBoxSize.boxW,
                    height: signatureBoxSize.boxH,
                    pageNumber: indx
                }]);
                drawField({
                    id: fieldId,
                    fieldName: signatureBox.fieldName,
                    posX: (posX / viewRect.width) * 100,
                    posY: (posY / viewRect.height) * 100,
                    height: signatureBoxSize.boxH,
                    width: signatureBoxSize.boxW,
                    viewerElement: viewerElement
                });
            }
            setDragStatus('done');
            setFieldBox(false);
        }
    }, [dragStatus])

    const fieldsRef = useRef<IFieldDetails[]>(fields);

    useEffect(() => {
        fieldsRef.current = fields;
    }, [fields]);

    useEffect(() => {
        setTimeout(() => {
            const rightPosition = pdfCanvasRef?.current?.getBoundingClientRect().width ?? 0;
            setFieldsContainerPos({ x: rightPosition - 210, y: 0 });
        }, 100);
    }, [numPages]);
    // useEffect(() => {
    //     setTimeout(() => {
    //         const pdfCanvas = document?.querySelector('.react-pdf__Page__canvas') as HTMLCanvasElement;
    //         console.log('pdfCanvas #', pdfCanvas);
    //         setPdfSize({
    //             h: parseInt(pdfCanvas?.style?.height, 10),
    //             w: parseInt(pdfCanvas?.style?.width, 10)
    //         });
    //     }, 500);
    //     console.log('change page', pageNumber);
    //     const removeFileds = fields.filter(field => field.pageNumber != pageNumber);
    //     const addFileds = fields.filter(field => field.pageNumber == pageNumber);

    //     console.log('removeFileds #', removeFileds);
    //     console.log('addFileds #', addFileds);

    //     removeFileds.map(fields => {
    //         removeField(fields?.id);
    //     })
    //     addFileds.map(fields => {
    //         drawField(
    //             fields?.id,
    //             fields?.fieldName,
    //             fields?.positionX,
    //             fields?.positionY,
    //             fields?.height,
    //             fields?.width
    //         );
    //     })
    // }, [pageNumber]);
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
                                <div style={{ position: 'fixed', zIndex: 50, cursor: "default", display: fieldsContainerPos.x > 0 ? '' : 'none' }}>
                                    <Draggable
                                        handle=".handle"
                                        position={fieldsContainerPos}
                                        onDrag={(_, data) => setFieldsContainerPos(data)}
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
                                <Document
                                    file={pdfFile}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    onClick={handleClick}
                                    loading={<span>Loading...</span>}
                                >
                                    {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => {
                                        return (
                                            <>
                                                <Page
                                                    key={page}
                                                    // scale={2}
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
                                                    zIndex: 10,
                                                    alignItems: ''
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
                                                    {signatureBox?.fieldName}
                                                </div>
                                            </div>
                                        </Draggable>
                                    )}
                                </Document>
                            </div>
                            {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10, gap: 10 }}>
                                <button onClick={() => setPageNumber((prevPage) => prevPage - 1)} disabled={pageNumber <= 1}>
                                    Previous Page
                                </button>
                                <div>Page {pageNumber} of {numPages}</div>
                                <button onClick={() => setPageNumber((prevPage) => prevPage + 1)} disabled={pageNumber >= numPages}>
                                    Next Page
                                </button>
                            </div> */}
                        </>
                    )
                }
            </div>

        </div>
    )
}

export default AdminPanel
