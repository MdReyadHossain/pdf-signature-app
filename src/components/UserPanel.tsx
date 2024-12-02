import { ModalWithHeader } from 'convertupleads-theme';
import { PDFDocument, PDFImage, rgb } from 'pdf-lib';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FaUndo } from 'react-icons/fa';
import { ImCheckboxChecked, ImCheckboxUnchecked } from 'react-icons/im';
import { IoMdWarning } from 'react-icons/io';
import { Document, Page } from "react-pdf";
import { DocumentCallback } from 'react-pdf/src/shared/types.js';
import { generateClickField, generateTextField } from '../helper/htmlStrings';
import { IFieldData, IFieldDetails } from '../helper/interface';
import { urlToFileName } from '../helper/utils';
import '../pdf-worker.config';
import SignatureUploader from './SignatureUploader';

interface IProps {
    pdfFile: File;
}

const UserPanel = ({ pdfFile }: IProps) => {
    const [signatureModal, setSignatureModal] = useState<boolean>(false);
    const [fields, setFields] = useState<IFieldDetails[]>([]);
    const [signature, setSignature] = useState<File>();
    const [numPages, setNumPages] = useState<number>(0);
    const [error, setError] = useState<string | null>();
    const pdfCanvasRef = useRef<HTMLDivElement>(null);
    const fieldsRef = useRef<IFieldDetails[]>(fields);

    const drawField = (field: IFieldData) => {
        if (field?.viewerElement)
            field.viewerElement.style.position = 'relative';
        if (field?.viewerElement) {
            if (field?.fieldType == 'TEXT' || field?.fieldType == 'NUMBER' || field?.fieldType == 'CHECKBOX') {
                field?.viewerElement.insertAdjacentHTML('beforeend', generateTextField(field));
                const inputElement = document.getElementById(`text-${field?.id}`) as HTMLInputElement;
                if (inputElement) {
                    inputElement.onchange = (e: any) => onChangeText(e, field?.id ?? '');
                }
            }
            else if (field?.fieldType == 'DROPDOWN') {

            } else {
                field?.viewerElement.insertAdjacentHTML('beforeend', generateClickField(field));
                const undoSign = document.querySelector(`.undo-${field?.id}`) as HTMLInputElement;
                if (undoSign) {
                    ReactDOM.render(<FaUndo />, undoSign);
                    undoSign.onclick = () => onUndoSignField(field?.id as string);
                }
            }
        }
    }

    const onUndoSignField = (id: string) => {
        const currentFields = fieldsRef?.current;
        const field = currentFields?.find(field => field.id == id);
        const element = document.getElementById(`click-${field?.id}`) as HTMLElement;
        element.innerHTML = `
            <div id="click-${field?.id}">
                ${field?.fieldName ?? 'Field'} 
                ${field?.required ? '<span style="color: red;">*</span>' : ''}
            </div>
        `;
        setFields(currentFields?.map(field => field.id === id ? {
            ...field, hasApplied: false
        } : field));
    }

    const onFillupField = (field: IFieldData) => {
        const element = document.getElementById(`click-${field?.id}`) as HTMLElement;
        console.log('element #', element);
        switch (field?.fieldType) {
            case 'SIGNATURE':
                element.innerHTML = `<img src=${URL.createObjectURL(signature as File)} height="${field?.height - 5}px" />`;
                break;
            case 'DATE':
                const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
                element.innerHTML = `<p>${currentDate}</p>`;
                break;
            default:
                break;
        }
    }

    const onChangeText = (e: ChangeEvent<HTMLInputElement>, id: string) => {
        const currentFields = fieldsRef?.current;
        const value = e.target.value;
        const checked = e.target.checked;
        console.log('checked #', checked);
        if (value == '') {
            setFields(currentFields?.map(field => field.id === id ? {
                ...field, textValue: value, hasApplied: false
            } : field));
        }
        setFields(currentFields?.map(field => field.id === id ? {
            ...field,
            textValue: value,
            hasApplied: field?.fieldType == 'CHECKBOX' ? checked : true,
            positionX: field?.positionX,
            positionY: field?.positionY,
        } : field));
    }

    const onDocumentLoadSuccess = (pdf: DocumentCallback) => {
        const pdfFileName = pdfFile instanceof File ? pdfFile?.name : urlToFileName(pdfFile);
        const storedFields = localStorage.getItem(pdfFileName);
        if (storedFields) {
            setFields(JSON.parse(storedFields));
        }
        setNumPages(pdf?.numPages);
    }

    const handleSignatureUpload = (file: File) => {
        setSignature(file);
        setSignatureModal(false);
    }

    const handleSetSignature = (event: MouseEvent) => {
        console.log('fields #', fields);
        const currentFields = fieldsRef?.current;
        const divId = (event.target as HTMLElement)?.id;
        const field = fields.find(field => field.id === divId.split('-').pop());
        if (field) {
            if (field?.fieldType == 'TEXT' || field?.fieldType == 'NUMBER') return;
            if (field?.fieldType == 'SIGNATURE' && !signature) {
                setError('Signature did not uploaded yet');
                setSignatureModal(true);
                return;
            }
            const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
            const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[field?.pageNumber] as HTMLCanvasElement;
            const canvasHeight = canvas?.style.height;
            const canvasWidth = canvas?.style.width;
            onFillupField({
                id: field?.id,
                fieldType: field?.fieldType,
                posX: field?.positionX,
                posY: field?.positionY,
                height: (field?.height / 100) * parseInt(canvasHeight),
                width: (field?.width / 100) * parseInt(canvasWidth),
                viewerElement: canvas,
            });
            setFields(currentFields?.map(currentField => currentField.id === field?.id ? {
                ...currentField,
                positionX: field?.positionX,
                positionY: field?.positionY,
                textValue: field?.fieldType == 'DATE' ? currentDate : undefined,
                hasApplied: true
            } : currentField));
        }
    }

    const onSignatureDone = async () => {
        const currentFields = fieldsRef?.current;
        console.log('currentFields #', currentFields);
        let pdfArrayBuffer;
        if (typeof pdfFile == 'string') {
            const pdfResponse = await fetch(pdfFile);
            pdfArrayBuffer = await pdfResponse.arrayBuffer();
        } else
            pdfArrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfArrayBuffer);

        for (let i = 0; i < currentFields?.length; i++) {
            if (currentFields[i]?.fieldType == 'TEXT') continue;
            if ((currentFields[i]?.required && currentFields[i]?.hasApplied) || !currentFields[i]?.required) continue;
            setError('Required fields(*) are not field yet!');
            return;
        }
        if (currentFields?.some(field => field?.fieldType === 'TEXT' && field?.required && !field?.hasApplied)) {
            console.log('Required text fields');
            setError('Required text fields(*) are not filled yet!');
            return;
        }

        for (const field of currentFields) {
            const page = pdfDoc.getPage(field?.pageNumber);

            if (!(pdfCanvasRef?.current)) return;
            const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[field?.pageNumber] as HTMLCanvasElement
            const canvasHeight = canvas?.style.height;
            const canvasWidth = canvas?.style.width;
            const viewport = canvas?.getBoundingClientRect();
            let fieldX = (field?.positionX / 100) * parseInt(canvasWidth);
            let fieldY = (field?.positionY / 100) * parseInt(canvasHeight);
            fieldX = (Number(fieldX) / viewport?.width) * page?.getWidth();
            fieldY = page.getHeight() - (Number(fieldY) / viewport?.height) * page.getHeight();

            const signatureWidth = (Number(field?.width) / 100) * page?.getWidth();
            const signatureHeight = (Number(field?.height) / 100) * page?.getHeight();

            const heightInPx = signatureHeight;
            const textSize = heightInPx * 0.6;
            if (field?.fieldType == 'SIGNATURE' && (!signature || !field?.hasApplied)) continue;
            if (signature && field?.fieldType == 'SIGNATURE') {
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
            } else if (!signature && field?.fieldType == 'SIGNATURE' && field?.required) {
                setError('Signature did not uploaded yet');
                setSignatureModal(true);
                return;
            } else if (field?.fieldType == 'CHECKBOX') {
                const checkSvg = ImCheckboxChecked({})?.props?.children[0]?.props?.d;
                const uncheckSvg = ImCheckboxUnchecked({})?.props?.children[0]?.props?.d;
                page.drawSvgPath(field?.hasApplied ? checkSvg : uncheckSvg, {
                    x: fieldX,
                    y: fieldY - 3,
                    scale: 0.7,
                    color: rgb(0, 0, 0),
                });
            } else {
                page.drawText(field?.textValue ?? '', {
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

        // const canvas = document.querySelectorAll('.react-pdf__Page__canvas')[field?.pageNumber] as HTMLCanvasElement;
        // const canvasHeight = canvas?.style.height;
        // const canvasWidth = canvas?.style.width;
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
        });
    }, [numPages]);

    useEffect(() => {
        fieldsRef.current = fields;
    }, [fields]);

    useEffect(() => {
        if (error) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
                setError(null);
            }, 3000);
        }
    }, [error]);
    return (
        <>
            <div>
                <h3 onClick={() => console.log('signatureDetails #', fields)}>User Panel</h3>
                <button onClick={() => setSignatureModal(true)}>Upload Signatrue</button>
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
            <ModalWithHeader title='Configure Signature' open={signatureModal} onClose={() => setSignatureModal(false)}>
                <SignatureUploader onUpload={handleSignatureUpload} />
            </ModalWithHeader>
        </>
    )
}

export default UserPanel
