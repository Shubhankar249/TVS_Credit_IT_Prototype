// import logo from './logo.svg';
import io from 'socket.io-client';
import * as faceapi from 'face-api.js'
import React, {useState, useEffect, useRef} from "react";
import Peer from "peerjs";
import axios from "axios";
import { Alert, Col, Container, Row } from 'react-bootstrap'
const baseUrl = "http://localhost:4200/";
const socket = io(baseUrl);
const myPeer = new Peer(undefined, {host: '/', port: 4201});

function PI(props) {
    const myStream = useRef(null);
    const myVideoRef = useRef();
    const otherVideoRef = useRef();
    const canvasRef = useRef();
    const kycImgRef = useRef();

    // States
    const [userId, setUserId] = useState(null);
    const [file, setFile] = useState(null);
    const [receivedFiles, setReceivedFiles] = useState([]);
    const [imageSRC, setImageSRC] = useState([]);
    const [isAgent, setIsAgent] = useState(props.isAgent);
    const [isCalledAnswered, setIsCalledAnswered] = useState(false);

    const loadModels = async () => {
        await faceapi.loadSsdMobilenetv1Model('./models')
        await faceapi.loadFaceLandmarkModel('./models')
        await faceapi.loadFaceRecognitionModel('./models')
    }

    useEffect(() => {
        console.log("$$$$");
        myPeer.on('open', id => {
            console.log("Curr user", id);
            socket.emit('join-room', 1, id);
        });

        // navigator.getUserMedia(
        //     {audio: true, video: {}},
        //     stream => {
        //         myStream.current = stream;
        //         myVideoRef.current.srcObject = stream;
        //         myVideoRef.current.play();
        //     },
        //     err => {
        //         alert("There is an error accessing your camera and microphone. If you have not given permissions, please reload and do the needful, it is mandatory.");
        //     }
        //
        // )

        navigator.mediaDevices.getUserMedia({audio: true, video: {facingMode: "user"}})
            .then(function (stream) {
                myStream.current = stream;
                myVideoRef.current.srcObject = stream;
                myVideoRef.current.play();
            })
            .catch(function (err) {
                alert("There is an error accessing your camera and microphone. If you have not given permissions, please reload and do the needful, it is mandatory.");
            });


        socket.on('user-connected', id => {  // A new user has joined the room
            setUserId(id);
            console.log("user aya h", id);
        });

        socket.on('user-disconnected', userId => {
            alert("User - " + userId + " disconnected");
            setUserId(null);
            otherVideoRef.current.pause();
            otherVideoRef.current.src = "";
        });

        socket.on('file-received', filename => {
            console.log(receivedFiles, filename);
            setReceivedFiles(filename);
        });

        myPeer.on('call', call => {
            const answerCall = window.confirm("Do you want to answer?");
            if (answerCall) {
                console.log("Answering a call");
                setIsCalledAnswered(true);
                call.answer(myStream.current);

                call.on('stream', stream => {
                    otherVideoRef.current.srcObject = stream;
                    otherVideoRef.current.play()
                    .catch(err => console.error(err));
                });
            } else {
                console.log("Called denied");
            }
        });

        loadModels().then(console.log("loaded"));

    }, []);


    const Call = () => {
        // Make a peerJs call and send them our stream
        console.log("Calling", userId);
        const call = myPeer.call(userId, myStream.current);

        // Receive their stream
        call.on('stream', stream => {
            otherVideoRef.current.srcObject = stream;
            otherVideoRef.current.play()
                .catch(err => console.error(err));
        });
    }

    const onChangeHandler = event => {
        setFile(event.target.files[0]);
    }

    const handleDocumentUpload = event => {
        event.preventDefault();
        const data = new FormData();
        data.append('testfile', file);

        fetch(baseUrl + 'file/file-upload', {
            method: 'POST',
            body: data
        })
            .then(res => res.json())
            .then(res => socket.emit('file-uploaded', res.filename))
            .catch(err => console.error(err));
    }

    const checkKyc = async () => {
        Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
            faceapi.nets.ssdMobilenetv1.loadFromUri('/models'), faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ])
            .then(async () => {
                console.log("pehle");
                const det1 = await faceapi.detectSingleFace(kycImgRef.current).withFaceLandmarks().withFaceDescriptor();
                console.log(det1);
                if (!det1) {
                    alert("Face not found in ID")
                    return
                }

                const matcher = new faceapi.FaceMatcher(det1)
                console.log("mathcer ke baad");

                const det2 = await faceapi.detectSingleFace(canvasRef.current).withFaceLandmarks().withFaceDescriptor()
                if (det2) {
                    console.log("det2 ke andar", det2);
                    const match = matcher.findBestMatch(det2.descriptor)
                    // console.log("detections in id = ", det1, det2, " = ", match)
                    // alert(match.toString())
                    if(match.label !== 'unknown') alert('KYC Ho gyi');
                } else alert("Kon ho tum");
            })
    }

    const handleFetchKYC = () => {
        axios({
            method: 'get',
            url: baseUrl + 'file/fetch-kyc'
        })
            .then(res => {
                setImageSRC(res.data.file);
                canvasRef.current.getContext('2d').drawImage(otherVideoRef.current, 0, 0, 200, 200);
                console.log(res.data.file);
            })
            .catch((error) => {
                alert(error);
            });
    }

    const callButton = () => {
        console.log("Call Button Called");
        console.log(isAgent, userId === true);
        if (userId && !isAgent) {
            console.log("Agent");
            return (
                <div>
                    <button onClick={Call}>Call Agent</button>
                    <hr/>
                    <header><h2>Upload Documents</h2></header>
                    <form onSubmit={handleDocumentUpload} encType="multipart/form-data">
                        <input type="file" name="testfile" onChange={onChangeHandler}/>
                        <button type="submit">Submit</button>
                    </form>
                </div>
            );
        } else if (isCalledAnswered && isAgent){
            return (
                <div>
                    <p>
                        <button onClick={handleFetchKYC}>Fetch KYC</button>
                    </p>
                    <Container fluid>
                        <Row>
                            <Col><h3>Image Compare Karega?</h3></Col>
                            <Col>
                                <canvas className="photo_canvas" ref={canvasRef} width="200" height="200"/>
                            </Col>
                            <Col><img ref={kycImgRef} src={imageSRC} alt="image aayegi" width="200" height="200"
                                      crossOrigin='anonymous'/></Col>
                            <p>
                                <button onClick={checkKyc}>Check KYC</button>
                            </p>
                        </Row>
                    </Container>
                </div>
            )
        } else {
            return (<></>);
        }
    }

    const handleDownload = () => {
        axios({
            method: 'get',
            url: baseUrl + 'file/download/?path='+receivedFiles,
            responseType: 'blob',
            headers: {},
        })
            .then((res) => {
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', receivedFiles);
                document.body.appendChild(link);
                link.click();
            })
            .catch((error) => {
                alert(error);
            });
    }

    const handleSetKYC = () => {
        axios({
            method: 'get',
            url: baseUrl + 'file/kyc-update?path='+receivedFiles,
        })
            .then(res => console.log(res))
            .catch((error) => {
                alert(error);
            });
    }

    const showReceivedFiles = () => {
        console.log("received files are, ", receivedFiles);
        if (receivedFiles.length === 0) return<></>;
        return (
            <div>
                <p> Received File - <button onClick={handleDownload}>Download</button> </p>

                <p> <button onClick={handleSetKYC}>Set As KYC</button> </p>
            </div>
        )
    }

    return (
        <div>
            <Container fluid>
                <Row>
                    <Col xs = {12} md ={6}>
                        <small>My Video</small>
                        <video muted={true} ref = {myVideoRef} style={{width: 600, height: 600}} />
                    </Col>
                    <Col>
                        <small>User/ Agent Video</small>
                        <video ref = {otherVideoRef} style={{width: 600, height: 600}} />
                    </Col>
                </Row>
                <hr/>
                {callButton()}
                {showReceivedFiles()}

            </Container>
        </div>
    );
}

export default PI;
