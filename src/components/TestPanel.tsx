import React, { useState } from 'react'
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Document, Page } from 'react-pdf';
import { DocumentCallback } from 'react-pdf/src/shared/types.js';

const TestPanel = () => {
    const [pdfFile, setPdfFile] = useState<File | string>('https://cdn.filestackcontent.com/wcrjf9qPTCKXV3hMXDwK');
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(0);
    const [pdfSize, setPdfSize] = useState<{ h: number, w: number }>({ h: 0, w: 0 });
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

    const onDocumentLoadSuccess = (pdf: DocumentCallback) => {
        setNumPages(pdf?.numPages);
        setPageNumber(1);
    }

    const onDrag = (_: DraggableEvent, data: DraggableData) => {
        console.log('DraggableData #', data);
        setDragPosition(data);
    }

    const onDragStop = (_: DraggableEvent, data: DraggableData) => {

    }
    return (
        <div>
            <Draggable
                position={dragPosition}
                // onStart={(data) => setDragPosition(data)}
                onDrag={onDrag}
                onStop={onDragStop}
            // bounds='parent'
            >
                <div
                    style={{
                        width: '100px',
                        height: '50px',
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
                            width: '100px',
                            height: '50px',
                            position: 'relative',
                        }}
                    >
                        Drag Box
                    </div>
                </div>
            </Draggable>
            <Document
                file={pdfFile}
                onLoadSuccess={onDocumentLoadSuccess}
                // onClick={handleClick}
                loading={<span>Loading...</span>}
            >
                {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => {
                    return (
                        <Page
                            key={page}
                            // scale={2}
                            width={900}
                            className={'page-container page-number-' + page}
                            pageNumber={page}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                        // onMouseDown={handleMoveFieldBox}
                        />
                    )
                })}
            </Document>
        </div>
    )
}

export default TestPanel
