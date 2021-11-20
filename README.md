## Overview
The application contains two modules, one is Automated KYC system and the other is Video based Customer Assessment for lending purposes.


#### Module - 1
- Prompting user to upload documents for KYC.
- Matching faces in Photo ID and Live Image using SSDMobileNet and FaceRecognition model from Faceapi.js
- Storing KYC document and current location in database for future reference

##### Demo
https://user-images.githubusercontent.com/43087492/142731427-11a54373-1718-45f9-a2a3-c2a358d9c7cb.mp4


#### Module - 2
- Connecting Agent and Customer via video call. 
- Allowing Face verification, Location verification against the documents provided during KYC
- Upload / Download Documents between the users


##### Demo
*yet to upload*


### How to Run
- Clone the frontend and backend repo on your system
- Run ```npm install``` in both frontend and backend folder
- Start frontend by using command ```npm start```
- Start backend using command ```node server```
- Start peerjs using command ```peerjs --port 4201```
- Access the client on ```http://localhost:3000```


## Technologies Used

#### Frontend
- *Reactjs*
- *React-bootstrap*
- *Peerjs* for peer to peer video call
- *Socket.io-client* for Realtime updates
- *Navigator API* for Webcam and GPS access
- *LocationIQ API* for Reverse Geolocation
- *Faceapi.js for* Face detection and Recognition

#### Backend
- Nodejs
- Expressjs
- MongoDB Atlas
- Socket.io
- Multer
