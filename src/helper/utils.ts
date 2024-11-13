export const generateUid = () => {
    const timestamp = new Date().getTime();
    return `id_${timestamp}`;
}