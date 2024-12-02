import { IFieldData } from "./interface";

export const generateAdminField = (field: IFieldData) => {
    const htmlString = `
        <div 
            id="${field?.id ?? ''}" 
            class="field-box"
            style="
                position: absolute;
                left: ${field?.posX}%;
                top: ${field?.posY}%;
                width: ${field?.width}%;
                height: ${field?.height}%;
                background-color: rgba(51, 204, 51, 0.2);
                border: 2px dashed green;
                cursor: grab;
                color: black;
                display: flex;
                justify-content: center;
                align-items: center;
                user-select: none;
            ">
            ${field?.fieldName ?? 'Field'}
            <div class="req-${field?.id} req-field">
                <input type="checkbox" id="check-${field?.id}"> <label for="check-${field?.id}" id="required">Required</label>
            </div>
            <div 
                class="delete-${field?.id} delete-field" 
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
                    z-index: 5;
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
                    z-index: 5;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transform: rotate(45deg);
                "
            ></div>
        </div>
    `;
    return htmlString;
}

export const generateTextField = (field: IFieldData) => {
    const htmlString = `
        <div 
            id="${field?.id ?? ''}" 
            style="
                position: absolute;
                left: ${field?.posX}%;
                top: ${field?.posY}%;
                width: ${field?.width}%;
                height: ${field?.height}%;
                background-color: rgba(51, 204, 51, 0.2);
                border: 2px dashed green;
                color: black;
                display: flex;
                justify-content: center;
                align-items: center;
                user-select: none;
            ">
            <input type="${field?.fieldType == 'TEXT' ? 'text' : 'number'}" class="text" id="text-${field?.id}" placeholder="${field?.fieldType == 'TEXT' ? 'Text Field' : 'Number Field'}" autocomplete="off">
            ${field?.required ? '<span style="color: red;">*</span>' : ''}
        </div>
    `;
    return htmlString;
}

export const generateClickField = (field: IFieldData) => {
    const htmlString = `
        <div 
            id="${field?.id ?? ''}" 
            style="
                position: absolute;
                left: ${field?.posX}%;
                top: ${field?.posY}%;
                width: ${field?.width}%;
                height: ${field?.height}%;
                background-color: rgba(51, 204, 51, 0.2);
                border: 2px dashed green;
                cursor: grab;
                color: black;
                display: flex;
                justify-content: center;
                align-items: center;
                user-select: none;
            ">
            <div id="click-${field?.id}">
                ${field?.fieldName ?? 'Field'} 
                ${field?.required ? '<span style="color: red;">*</span>' : ''}
            </div>
            <div 
                class="undo-${field?.id} undo" 
                style="
                    width: 15px;
                    height: 15px;
                    border-radius: 50%;
                    border: 1px solid black;
                    position: absolute;
                    background-color: white;
                    color: black;
                    cursor: pointer;
                    top: -10px;
                    right: -10px;
                    font-size: 10px;
                    z-index: 5;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                "
            ></div>
        </div>
    `;
    return htmlString;
}