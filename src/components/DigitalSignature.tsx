import { Box, IconButton, RestoreIcon, Stack } from 'convertupleads-theme';
import { KonvaEventObject } from 'konva/lib/Node';
import { Stage as stageType } from 'konva/lib/Stage';
import { useEffect, useRef, useState } from 'react';
import { Layer, Line, Stage } from 'react-konva';

interface ILineProps {
    points: number[];
    strok?: string;
    strokeWidt?: number;
    tensio?: number;
    lineCa?: string;
    lineJoi?: string;
}

interface IProps {
    onChange: (file: File) => void;
}

const DigitalSignature = ({ onChange }: IProps) => {
    const [lines, setLines] = useState<ILineProps[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [redoStack, setRedoStack] = useState<ILineProps[]>([]);
    const stageRef = useRef<stageType>(null);
    function getWidth() {
        const signature = document.querySelector('.signature-container') as HTMLElement;
        const viewRect = signature?.getBoundingClientRect();
        return viewRect?.width;
    }
    function getHeight() {
        const signature = document.querySelector('.signature-container') as HTMLElement;
        const viewRect = signature?.getBoundingClientRect();
        return viewRect?.height;
    }
    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        setIsDrawing(true);
        setRedoStack([]);
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        setLines([...lines, { points: [pos.x, pos.y] }]);
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        if (!isDrawing) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        const lastLine = lines[lines.length - 1];
        const updatedLine = {
            ...lastLine,
            points: [...lastLine.points, pos.x, pos.y],
        };

        setLines([...lines.slice(0, -1), updatedLine]);
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        handleSave();
    };

    const handleUndo = () => {
        if (lines.length === 0) return;
        const updatedLines = [...lines];
        const popped = updatedLines.pop();
        if (popped) {
            setRedoStack(prevState => [popped, ...prevState]);
        }
        setLines(updatedLines);
        handleSave();
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const restoredLine = redoStack[0];
        setRedoStack(prevState => prevState.slice(1));
        setLines(prevState => [...prevState, restoredLine]);
        handleSave();
    };

    const handleSave = () => {
        if (!stageRef.current) return;
        const dataURL = stageRef.current.toDataURL({
            mimeType: "image/png",
            pixelRatio: 2,
        });

        fetch(dataURL)
            .then((res) => res.blob())
            .then((blob) => {
                const file = new File([blob], "canvas-image.png", { type: "image/png" });
                onChange(file);
                console.log("File created:", file);
            })
            .catch((err) => {
                console.error("Error converting to file:", err);
            });

        // const url = URL.createObjectURL(file);
        // const link = document.createElement("a");
        // link.href = url;
        // link.download = "signature.png";
        // document.body.appendChild(link);
        // link.click();
        // document.body.removeChild(link);
    };

    useEffect(() => {
        if (stageRef?.current) {
            stageRef.current.height(getHeight());
            stageRef.current.width(getWidth());
        }
        const handleGlobalMouseUp = () => {
            if (isDrawing) setIsDrawing(false);
            handleSave();
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDrawing]);

    return (
        <Stack>
            <Box>
                <IconButton title='Undo' onClick={handleUndo}>
                    <RestoreIcon style={{ transform: 'scaleX(-1)' }} />
                </IconButton>
                <IconButton title='Redo' onClick={handleRedo}>
                    <RestoreIcon />
                </IconButton>
                {/* <button onClick={handleSave}>Save</button> */}
            </Box>
            <Box className='signature-container' height={300} width={400}>
                <Stage
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{ border: '1px solid black', backgroundColor: 'white' }}
                    ref={stageRef}
                >
                    <Layer>
                        {lines.map((line, i) => (
                            <Line
                                key={i}
                                points={line.points}
                                stroke='#000'
                                strokeWidth={3}
                                tension={0.5}
                                lineCap='round'
                                lineJoin='round'
                            />
                        ))}
                    </Layer>
                </Stage>
            </Box>
        </Stack>
    );
};

export default DigitalSignature;
