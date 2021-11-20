// import logo from './logo.svg';
import io from 'socket.io-client';
import * as faceapi from 'face-api.js'
import React, {useState, useEffect, useRef} from "react";
import Peer from "peerjs";
import axios from "axios";
import { Alert, Col, Container, Row } from 'react-bootstrap'
const baseUrl = "http://localhost:4200/";
const socket = io(baseUrl);

const myPeer = new Peer(undefined, {host: 'tvs-video-call-peerjs.herokuapp.com', port: 443, secure: true});

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
    const [userLocationObj, setUserLocationObj] = useState({});
    const [kycLocationObj, setKycLocationObj] = useState({});

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

        socket.on('fetch-location', () => {
            getGeolocation();
            console.log("fetching location", userLocationObj);
            // socket.emit('sending-location', userLocationObj);
        });

        socket.on('receive-location', (userLocation) => {
            console.log("receiving location");
            setUserLocationObj(userLocation);
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

    useEffect(() => {
        if (!isAgent && userLocationObj) {
            socket.emit('sending-location', userLocationObj);
        }
    }, [userLocationObj]);

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
                    if(match.label !== 'unknown') alert('Face Verified :)');
                } else alert("Face not matched :(");
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

    const handleFetchLocation = () => {
        socket.emit('request-location');
        axios({
            method: 'get',
            url: baseUrl + 'file/get-location'
        })
            .then(res => {
                console.log("Loc ayi h", res.data);
                setKycLocationObj(res.data.location);
            })
            .catch((error) => {
                alert(error);
            });
    }

    const checkLocation = () => {
        alert('Geo-Location Verified');
    }

    const callButton = () => {
        console.log("Call Button Called");
        console.log(isAgent, userId === true);
        if (userId && !isAgent) {
            console.log("Agent");
            return (
                <div>
                    <button className={"btn btn-secondary"} onClick={Call}>Call Agent</button>
                    <hr/>
                    <header><h2>Upload Documents</h2></header>
                    <form className={"p-4"} onSubmit={handleDocumentUpload} encType="multipart/form-data">
                        <input type="file" name="testfile" onChange={onChangeHandler}/>
                        <button className={"btn btn-primary"} type="submit">Submit</button>
                    </form>
                </div>
            );
        } else if (isCalledAnswered && isAgent){
            return (
                <div className={"bg-light m-2 p-4"}>
                    <header><center><h3>KYC Verification</h3></center></header>
                    <Container fluid>
                        <header><h4 className={"text-primary"}> Face Verification </h4></header>
                        <Row>
                            <p>
                                <button className={"m-2 btn btn-secondary"} onClick={handleFetchKYC}>Fetch KYC</button>
                            </p>
                            <Col>
                                <canvas className="photo_canvas" ref={canvasRef} width="200" height="200"/>
                            </Col>
                            <Col>
                                <img ref={kycImgRef} src={imageSRC} alt="image aayegi" width="200" height="200" crossOrigin='anonymous'/>
                                <button className={"m-5 btn btn-success"} onClick={checkKyc}>Check KYC</button>
                            </Col>
                        </Row>
                    </Container>
                    <hr className={"m-4"}/>
                    <Container fluid className={"mt-4"}>
                        <header><h4 className={"text-primary"}> Geo-Location Verification </h4></header>
                        <Row>
                            <p>
                                <button className={"m-2 btn btn-secondary"} onClick={handleFetchLocation}>Fetch GeoLocation</button>
                            </p>
                            <Col>
                                <label>Current Location:</label>
                                <input className={"m-2"} type={"text"} placeholder={`${userLocationObj?.town}, ${userLocationObj?.country}, ${userLocationObj?.postcode}`} disabled/>
                            </Col>
                            <Col>
                                <label>KYC Location: </label>
                                <input className={"m-2"} type={"text"} placeholder={`${kycLocationObj?.town}, ${kycLocationObj?.country}, ${kycLocationObj?.postcode}`} disabled/>
                                <button className={"m-5 btn btn-success"} onClick={checkLocation}>Verify Location</button>
                            </Col>
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
        if (!isCalledAnswered || !isAgent) return<></>;
        return (
            <div className={"m-2 p-4"}>
                <header><center><h3>User Documents</h3></center></header>
                {receivedFiles.length?
                    <p className={"p-4"}> Received File -
                        <button className={"btn btn-secondary m-2"} onClick={handleDownload}>Download</button>
                        <button className={"btn btn-success m-2"} onClick={handleSetKYC}>Set As KYC</button>
                    </p>
                    : <></>}
            </div>
        )
    }

    const reverseGeolocate = async (lat, long) => {
        const LOCATION_API_KEY = "pk.fccf22209d9a90a5cba88f11c7c8bfdb";
        const url = `https://eu1.locationiq.com/v1/reverse.php?key=${LOCATION_API_KEY}&lat=${lat}&lon=${long}&format=json`;
        await fetch(url)
            .then(res => res.json())
            .then(data => {
                console.log(data.address)
                setUserLocationObj({...data.address, lat, long});
            })
            .catch(e => console.log(e))
    }

    const getGeolocation = () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            console.log(pos)
            reverseGeolocate(pos.coords.latitude, pos.coords.longitude)
        })
    }

    return (
        <div>
            <Container fluid>
                <Row className={"bg-info"}>
                    <Col xs = {12} md ={6}>
                        <center><p className={"text-white fw-bold"}>My Video</p></center>
                        <video muted={true} ref = {myVideoRef} style={{width: 600, height: 600}} />
                    </Col>
                    <Col>
                        <center><p className={"text-white fw-bold"}> {!isAgent? "Agent" : "User"} Video</p></center>
                        <video ref = {otherVideoRef} style={{width: 600, height: 600}} />
                    </Col>
                </Row>
                <Row className={"m-2 p-4"}>
                    <Col className={"bg-light"} xs={12} md = {8}>{callButton()}</Col>
                    <Col className={"bg-light"}>{showReceivedFiles()}</Col>
                </Row>
            </Container>
        </div>
    );
}

export default PI;
