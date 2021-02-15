import React, { Component, Fragment } from 'react';
import {
    Alert, Button, Collapse, Container, Form, Spinner, ListGroup, Tabs, Tab
} from 'react-bootstrap';
import { FaCamera, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import Cropper  from 'react-cropper';
import LoadButton from '../components/LoadButton';
import './Classify.css';
import 'cropperjs/dist/cropper.css';
import ModelClassifier from '../ai-models/ModelClassifier';
import ModelImage from '../ai-models/ModelImage';
import * as tf from '@tensorflow/tfjs';

const IMAGE_SIZE = 224;
const CANVAS_SIZE = 224;
const TOPK_PREDICTIONS = 5;

/**
 * Class to handle the rendering of the NewClassify page.
 * @extends React.Component
 */
export default class NewClassify extends Component {

    constructor(props) {
        super(props);

        this.model = new ModelClassifier();
        this.model = null;
        this.modelLastUpdated = null;
        this.webcam = null;


        this.state = {
            modelLoaded: false,
            filename: '',
            isModelLoading: false,
            isClassifying: false,
            predictions: [],
            photoSettingsOpen: true,
            modelUpdateAvailable: false,
            showModelUpdateAlert: false,
            showModelUpdateSuccess: false,
            isDownloadingModel: false
        };
    }

    async componentDidMount() {

        this.model = new ModelClassifier();
        await this.model.initModel();

        this.setState({ modelLoaded: true });
        await this.initWebcam(this.refs.webCam, this.refs.noWebcam);

        await this.model.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]));
    }

    async componentWillUnmount() {
        this.webcam.stop();
        this.model.dispose();
    }

    actionUpdateModel = async () => {
        this.model = await this.updateModel();
    }

    actionClassifyLocalImage = async () => {

        this.setState({ isClassifying: true });

        const croppedCanvas = this.refs.cropper.getCroppedCanvas();

        // Process and resize image before passing in to model.
        const imageModel = new ModelImage();
        const X = await imageModel.fitTransform(
            {image: croppedCanvas, from:'canvas', width: IMAGE_SIZE, height: IMAGE_SIZE});

        const y = await this.model.predict(X);
        const predictions = this.model.getTopKClasses(y, TOPK_PREDICTIONS);

        this.setState({
            predictions,
            isClassifying: false,
            photoSettingsOpen: !this.state.photoSettingsOpen
        });

        await imageModel.renderImageFromUpload(croppedCanvas, this.refs.canvas);

        imageModel.dispose();
        this.model.dispose();
    }

    actionClassifyWebcamImage = async () => {

        this.setState({ isClassifying: true });

        const imageCapture = await this.webcam.capture();

        const imageModel = new ModelImage();
        const X = await imageModel.fitTransform(
            {image: imageCapture, from: 'webcam', width: IMAGE_SIZE, height: IMAGE_SIZE});

        const y = await this.model.predict(X);
        const predictions = this.model.getTopKClasses(y, TOPK_PREDICTIONS);

        this.setState({
            predictions,
            isClassifying: false,
            photoSettingsOpen: !this.state.photoSettingsOpen
        });

        await imageModel.renderImageFromCamera(imageCapture, this.refs.canvas);

        imageModel.dispose();
        this.model.dispose();

    }

    handlePanelClick = event => {
        this.setState({ photoSettingsOpen: !this.state.photoSettingsOpen });
    }

    handleFileChange = event => {
        if (event.target.files && event.target.files.length > 0) {
            this.setState({
                file: URL.createObjectURL(event.target.files[0]),
                filename: event.target.files[0].name
            });
        }
    }

    handleTabSelect = activeKey => {
        switch(activeKey) {
            case 'camera':
                this.startWebcam();
                break;
            case 'localfile':
                this.setState({filename: null, file: null});
                this.stopWebcam();
                break;
            default:
        }
    }

    render() {
        return (
            <div className="Classify container">

                { !this.state.modelLoaded &&
                <Fragment>
                    <Spinner animation="border" role="status">
                        <span className="sr-only">Loading...</span>
                    </Spinner>
                    {' '}<span className="loading-model-text">Loading Model</span>
                </Fragment>
                }

                { this.state.modelLoaded &&
                <Fragment>
                    <Button
                        onClick={this.handlePanelClick}
                        className="classify-panel-header"
                        aria-controls="photo-selection-pane"
                        aria-expanded={this.state.photoSettingsOpen}
                    >
                        Take or Select a Photo to NewClassify
                        <span className='panel-arrow'>
            { this.state.photoSettingsOpen
                ? <FaChevronDown />
                : <FaChevronRight />
            }
            </span>
                    </Button>
                    <Collapse in={this.state.photoSettingsOpen}>
                        <div id="photo-selection-pane">
                            { this.state.modelUpdateAvailable && this.state.showModelUpdateAlert &&
                            <Container>
                                <Alert
                                    variant="info"
                                    show={this.state.modelUpdateAvailable && this.state.showModelUpdateAlert}
                                    onClose={() => this.setState({ showModelUpdateAlert: false})}
                                    dismissible>
                                    An update for the <strong>{this.state.modelType}</strong> model is available.
                                    <div className="d-flex justify-content-center pt-1">
                                        {!this.state.isDownloadingModel &&
                                        <Button onClick={this.actionUpdateModel}
                                                variant="outline-info">
                                            Update
                                        </Button>
                                        }
                                        {this.state.isDownloadingModel &&
                                        <div>
                                            <Spinner animation="border" role="status" size="sm">
                                                <span className="sr-only">Downloading...</span>
                                            </Spinner>
                                            {' '}<strong>Downloading...</strong>
                                        </div>
                                        }
                                    </div>
                                </Alert>
                            </Container>
                            }
                            {this.state.showModelUpdateSuccess &&
                            <Container>
                                <Alert variant="success"
                                       onClose={() => this.setState({ showModelUpdateSuccess: false})}
                                       dismissible>
                                    The <strong>{this.state.modelType}</strong> model has been updated!
                                </Alert>
                            </Container>
                            }
                            <Tabs defaultActiveKey="camera" id="input-options" onSelect={this.handleTabSelect}
                                  className="justify-content-center">
                                <Tab eventKey="camera" title="Take Photo">
                                    <div id="no-webcam" ref="noWebcam">
                                        <span className="camera-icon"><FaCamera /></span>
                                        No camera found. <br />
                                        Please use a device with a camera, or upload an image instead.
                                    </div>
                                    <div className="webcam-box-outer">
                                        <div className="webcam-box-inner">
                                            <video ref="webcam" autoPlay playsInline muted id="webcam"
                                                   width="448" height="448">
                                            </video>
                                        </div>
                                    </div>
                                    <div className="button-container">
                                        <LoadButton
                                            variant="primary"
                                            size="lg"
                                            onClick={this.actionClassifyWebcamImage}
                                            isLoading={this.state.isClassifying}
                                            text="NewClassify"
                                            loadingText="Classifying..."
                                        />
                                    </div>
                                </Tab>
                                <Tab eventKey="localfile" title="Select Local File">
                                    <Form.Group controlId="file">
                                        <Form.Label>Select Image File</Form.Label><br />
                                        <Form.Label className="imagelabel">
                                            {this.state.filename ? this.state.filename : 'Browse...'}
                                        </Form.Label>
                                        <Form.Control
                                            onChange={this.handleFileChange}
                                            type="file"
                                            accept="image/*"
                                            className="imagefile" />
                                    </Form.Group>
                                    { this.state.file &&
                                    <Fragment>
                                        <div id="local-image">
                                            <Cropper
                                                ref="cropper"
                                                src={this.state.file}
                                                style={{height: 400, width: '100%'}}
                                                guides={true}
                                                aspectRatio={1 / 1}
                                                viewMode={2}
                                            />
                                        </div>
                                        <div className="button-container">
                                            <LoadButton
                                                variant="primary"
                                                size="lg"
                                                disabled={!this.state.filename}
                                                onClick={this.actionClassifyLocalImage}
                                                isLoading={this.state.isClassifying}
                                                text="NewClassify"
                                                loadingText="Classifying..."
                                            />
                                        </div>
                                    </Fragment>
                                    }
                                </Tab>
                            </Tabs>
                        </div>
                    </Collapse>
                    { this.state.predictions.length > 0 &&
                    <div className="classification-results">
                        <h3>Predictions</h3>
                        <canvas ref="canvas" width={CANVAS_SIZE} height={CANVAS_SIZE} />
                        <br />
                        <ListGroup>
                            {this.state.predictions.map((category) => {
                                return (
                                    <ListGroup.Item key={category.className}>
                                        <strong>{category.className}</strong> {category.probability}%</ListGroup.Item>
                                );
                            })}
                        </ListGroup>
                    </div>
                    }
                </Fragment>
                }
            </div>
        );
    }

    async initWebcam(webcam, noWebcam){

        try {
            this.webcam = await tf.data.webcam(
                this.refs.webcam,
                {resizeWidth: CANVAS_SIZE, resizeHeight: CANVAS_SIZE, facingMode: 'environment'}
            );
        }
        catch (e) {
            this.refs.noWebcam.style.display = 'block';
        }

        // try {
        //     this.webcam = await tf.data.webcam(
        //         webcam,
        //         {resizeWidth: CANVAS_SIZE, resizeHeight: CANVAS_SIZE, facingMode: 'environment'}
        //     );
        // }
        // catch (e) {
        //     noWebcam.style.display = 'block';
        // }
    }

    async startWebcam(){
        if (this.webcam) {
            this.webcam.start();
        }
    }

    async stopWebcam(){
        if (this.webcam) {
            this.webcam.stop();
        }
    }
    
}
