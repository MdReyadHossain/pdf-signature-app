export interface IFieldDetails {
    id: string;
    fieldName: string;
    fieldType: string;
    positionX: number;
    positionY: number;
    height: number;
    width: number;
    pageNumber: number;
    hasApplied: boolean;
    textValue?: string;
    required?: boolean;
}

export interface IFieldButton {
    icon?: JSX.Element;
    fieldName: string;
    fieldType: string;
    positionX: number;
    positionY: number;
    height: number;
    width: number;
}

export interface ISignature {
    positionX: number;
    positionY: number;
    height: number;
    width: number;
    pageNumber: number;
}

export interface ISignatureSize {
    boxH: number,
    boxW: number
}

export interface ISignaturePosition {
    x: number,
    y: number,
    posX: number,
    posY: number,
}

export interface IFieldData {
    id: string,
    fieldName?: string,
    fieldType?: string,
    required?: boolean,
    posX: number,
    posY: number,
    height: number,
    width: number,
    viewerElement: HTMLElement | HTMLCanvasElement,
}