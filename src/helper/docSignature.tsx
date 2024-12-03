import { AiOutlineSignature } from "react-icons/ai";
import { BsCalendar2Date } from "react-icons/bs";
import { CgFormatText } from "react-icons/cg";
import { FaCheckCircle } from "react-icons/fa";
import { TbNumber123 } from "react-icons/tb";
import { IFieldButton } from "./interface";

export const fieldButtons: IFieldButton[] = [
    {
        icon: <AiOutlineSignature />,
        fieldName: "Signature Field",
        fieldType: "SIGNATURE",
        positionX: 0,
        positionY: 0,
        height: 100,
        width: 150,
    },
    {
        icon: <BsCalendar2Date />,
        fieldName: "Date Field",
        fieldType: "DATE",
        positionX: 0,
        positionY: 0,
        height: 50,
        width: 200,
    },
    {
        icon: <TbNumber123 />,
        fieldName: "Number Field",
        fieldType: "NUMBER",
        positionX: 0,
        positionY: 0,
        height: 50,
        width: 200,
    },
    {
        icon: <CgFormatText />,
        fieldName: "Text Field",
        fieldType: "TEXT",
        positionX: 0,
        positionY: 0,
        height: 50,
        width: 300,
    },
    {
        icon: <FaCheckCircle />,
        fieldName: "Check Field",
        fieldType: "CHECKBOX",
        positionX: 0,
        positionY: 0,
        height: 30,
        width: 30,
    },
    // {
    //     icon: <RxDropdownMenu />,
    //     fieldName: "Dropdown Field",
    //     fieldType: "DROPDOWN",
    //     positionX: 0,
    //     positionY: 0,
    //     height: 50,
    //     width: 200,
    // }
]