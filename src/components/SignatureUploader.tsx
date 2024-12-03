import { Box, Button, Divider, FileUpload, Stack, Tab, Tabs } from 'convertupleads-theme';
import { useState } from 'react';
import DigitalSignature from './DigitalSignature';

function TabPanel(props: any) {
    // eslint-disable-next-line react/prop-types
    const { children, value, index, ...other } = props;

    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`templates-tabpanel-${index}`}
            aria-labelledby={`templates-tab-${index}`}
            {...other}
        >
            {value === index && <Box>{children}</Box>}
        </div>
    );
}

interface IProps {
    onUpload: (file: File) => void;
}

const SignatureUploader = ({ onUpload }: IProps) => {
    const [imageUploading, _] = useState<boolean>(false);
    const [value, setValue] = useState<number>(0);
    const [file, setFile] = useState<File>();

    const handleChange = (_event: any, newValue: any) => {
        setValue(newValue);
    };

    const handleImageUpload = (files: File[]) => {
        if (!files || files.length == 0) return;
        const file: any = files[0];
        if (!file?.name?.split('.').pop().match('jpg|jpeg|png|gif')) {
            return;
        }

        if (file.size / (1024 * 1024) > 2) {
            return;
        }
        setFile(file);
    };

    const handleFileSubmit = () => {
        onUpload(file as File); // for testing purposes
    }
    return (
        <>
            <Box mx={3}>
                <Tabs
                    value={value}
                    onChange={handleChange}
                    variant='scrollable'
                    scrollButtons='auto'
                    aria-label='scrollable auto tabs example'
                >
                    <Tab label='Upload Signature' />
                    <Tab label='Digital Signature' />
                </Tabs>

                <Box p={3}>
                    <TabPanel value={value} index={0}>
                        <FileUpload
                            status={imageUploading ? 'loading' : 'success'}
                            onChange={(file: File[]) => handleImageUpload(file)}
                            multiple={false}
                        />
                    </TabPanel>
                    <TabPanel value={value} index={1}>
                        <DigitalSignature onChange={(file) => setFile(file)} />
                    </TabPanel>
                </Box>
            </Box>
            <Divider />
            <Stack m={3}>
                <Button color='primary' variant='contained' onClick={handleFileSubmit}>
                    Upload
                </Button>
            </Stack>
        </>
    )
}

export default SignatureUploader
