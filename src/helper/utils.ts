export const generateUid = () => {
    const timestamp = new Date().getTime();
    return `id_${timestamp}`;
}

export const urlToFileName = (url: string) => {
    const parts = url.split('/');
    const fileName = parts.pop();
    return fileName ? fileName.replace('.pdf', '') : '';
}