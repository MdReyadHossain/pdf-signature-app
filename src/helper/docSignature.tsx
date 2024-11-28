import { AiOutlineSignature } from "react-icons/ai";
import { IFieldButton } from "./interface";
import { BsCalendar2Date } from "react-icons/bs";
import { CgFormatText } from "react-icons/cg";

export const fieldButtons: IFieldButton[] = [
    {
        icon: <AiOutlineSignature />,
        fieldName: "Signature Field",
        fieldType: "SIGNATURE",
        positionX: 0,
        positionY: -300,
        height: 100,
        width: 150,
    },
    {
        icon: <BsCalendar2Date />,
        fieldName: "Date Field",
        fieldType: "DATE",
        positionX: 0,
        positionY: -300,
        height: 50,
        width: 200,
    },
    {
        icon: <CgFormatText />,
        fieldName: "Text Field",
        fieldType: "TEXT",
        positionX: 0,
        positionY: -300,
        height: 50,
        width: 300,
    },
]