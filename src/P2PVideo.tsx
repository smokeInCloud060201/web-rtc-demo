// ScreenShare.tsx
import React, {useEffect, useRef, useState} from "react";
import {sendOffer, subscribe} from "./service/app.service.ts";
import type {EventSourcePolyfill} from "event-source-polyfill";

const STUN_SERVERS = [{urls: "turn:10.10.20.99:3478", username: "testuser", credential: "testpass"}];

const P2PShareVideo: React.FC = () => {

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const eventSourceRef = useRef<EventSourcePolyfill | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const isMakingOfferRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [connected, setConnected] = useState(false);

    const log = (...args: unknown[]) => console.log("[ScreenShare]", ...args);

    const createPeerConnectionIfNeeded = () => {
        if (pcRef.current) return pcRef.current;

        const pc = new RTCPeerConnection({iceServers: STUN_SERVERS});
        pcRef.current = pc;
        log("created RTCPeerConnection");

        pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                log("onicecandidate -> sending candidate", ev.candidate);
                // send candidate to other side
                sendOffer({
                    kioskName: localStorage.getItem("kioskName") || "",
                    deviceName: localStorage.getItem("deviceName") || "",
                    payload: {payload: ev.candidate, state: "CANDIDATE"}
                });
            } else {
                // null candidate: ICE gathering finished
                log("ICE gathering finished (null candidate).");
            }
        };

        pc.ontrack = (ev) => {
            log("ontrack - remote streams:", ev.streams);
            if (videoRef.current) {
                videoRef.current.srcObject = ev.streams[0];
                videoRef.current.muted = true; // autoplay safe
                videoRef.current.play().catch(err => console.error("play() failed", err));
            }
        };

        pc.onconnectionstatechange = () => {
            log("connectionState:", pc.connectionState);
            if (pc.connectionState === "connected") {
                setConnected(true);
            } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                setConnected(false);
            }
        };

        // Use onnegotiationneeded to create offers after adding tracks
        pc.onnegotiationneeded = async () => {
            if (isMakingOfferRef.current) {
                log("Already making an offer, skipping negotiationneeded");
                return;
            }

            try {
                isMakingOfferRef.current = true;
                log("onnegotiationneeded -> creating offer");
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                log("onnegotiationneeded -> localDescription set, sending OFFER");
                await sendOffer({
                    kioskName: localStorage.getItem("kioskName") || "",
                    deviceName: localStorage.getItem("deviceName") || "",
                    payload: {payload: pc.localDescription, state: "OFFER"}
                });
            } catch (err) {
                console.error("negotiation error:", err);
            } finally {
                isMakingOfferRef.current = false;
            }
        };

        return pc;
    };

    const startScreenShare = async () => {
        try {
            const pc = createPeerConnectionIfNeeded();
            log("starting getDisplayMedia");
            log("navigator.mediaDevices", navigator.mediaDevices)
            log("navigator", navigator)
            // @ts-ignore
            const stream = await navigator.mediaDevices.getDisplayMedia({video: {displaySurface: "browser"}, preferCurrentTab: true});
            log("got display stream", stream);

            // add all tracks (this will trigger onnegotiationneeded)
            stream.getTracks().forEach((track) => {
                pc.addTrack(track, stream);
                log("added track to pc:", track.kind, track.id);
                // optionally monitor when user stops sharing:
                track.onended = () => {
                    log("screen track ended");
                };
            });

            // onnegotiationneeded will fire automatically and send OFFER
        } catch (err) {
            console.error("startScreenShare error:", err);
        }
    };

    /** set remote description and drain queued candidates */
    const applyRemoteDescriptionAndDrain = async (desc: RTCSessionDescriptionInit) => {
        const pc = createPeerConnectionIfNeeded();
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(desc));
            log("setRemoteDescription done:", desc.type);

            // apply any pending remote candidates
            if (pendingCandidatesRef.current.length > 0) {
                log("adding pending candidates:", pendingCandidatesRef.current.length);
                for (const cand of pendingCandidatesRef.current) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(cand));
                        log("added pending candidate");
                    } catch (err) {
                        console.warn("failed to add pending candidate", err);
                    }
                }
                pendingCandidatesRef.current = [];
            }
        } catch (err) {
            console.error("applyRemoteDescription failed:", err);
        }
    };

    // SSE subscribe handler
    useEffect(() => {
        const es = subscribe({
            kioskName: localStorage.getItem("kioskName") || "",
            deviceName: localStorage.getItem("deviceName") || ""
        });
        eventSourceRef.current = es;
        log("subscribed to SSE");

        es.addEventListener("message", async (event) => {
            try {
                const raw = event.data;
                const data = JSON.parse(raw);
                log("SSE message received:", data);

                const state: string = data?.state;
                const payload = data?.payload;

                log(" payload?.offer ", payload?.offer)

                if (state === "OFFER" && payload) {
                    // remote sent an offer -> we must setRemoteDescription and answer
                    log("received OFFER");
                    await createPeerConnectionIfNeeded();
                    await applyRemoteDescriptionAndDrain(payload);

                    // create & send answer
                    const pc = pcRef.current!;
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    log("created answer, sending OFFERED");
                    await sendOffer({
                        kioskName: localStorage.getItem("kioskName") || "",
                        deviceName: localStorage.getItem("deviceName") || "",
                        payload: {payload: pc.localDescription, state: "OFFERED"}
                    });
                } else if (state === "OFFERED" && payload) {
                    // remote sent an answer to our offer
                    log("received OFFERED (answer)");
                    await applyRemoteDescriptionAndDrain(payload);
                } else if (state === "CANDIDATE" && payload) {
                    log("received CANDIDATE", payload);
                    const pc = pcRef.current;
                    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(payload));
                            log("added remote candidate immediately");
                        } catch (err) {
                            console.warn("addIceCandidate failed:", err);
                            // if fails, queue
                            pendingCandidatesRef.current.push(payload);
                        }
                    } else {
                        // remoteDesc not set yet: queue candidate
                        pendingCandidatesRef.current.push(payload);
                        log("queued remote candidate (waiting remoteDescription)");
                    }
                } else {
                    log("unknown state or malformed message:", state, payload);
                }
            } catch (err) {
                console.error("error handling SSE message:", err);
            }
        });

        es.onerror = (err) => {
            console.error("SSE error", err);
            es.close();
        };

        return () => {
            try {
                es.close();
            } catch { /* empty */
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // small UI
    return (
        <div style={{textAlign: "center"}}>
            <h3>ScreenShare (renegotiate + ICE)</h3>
            <div style={{marginBottom: 12}}>
                <button onClick={() => createPeerConnectionIfNeeded()}>Create PC (ready)</button>
                <button onClick={() => createPeerConnectionIfNeeded() && setConnected(false)} style={{marginLeft: 8}}>
                    Reset connected state
                </button>
            </div>
            <div style={{marginBottom: 12}}>
                <button onClick={startScreenShare}>Start Screen Share</button>
            </div>
            <div>
                <video ref={videoRef} autoPlay playsInline style={{width: "80%", border: "1px solid #ccc"}}/>
            </div>
            <div style={{marginTop: 8}}>
                <small>connected: {String(connected)}</small>
            </div>
        </div>
    );
};

export default P2PShareVideo;
