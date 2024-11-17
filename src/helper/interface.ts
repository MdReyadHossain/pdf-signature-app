export interface IFieldDetails {
    id: string;
    fieldName: string;
    fieldType: string;
    positionX: number;
    positionY: number;
    height: number;
    width: number;
    pageNumber: number;
}

export interface IFieldButton {
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