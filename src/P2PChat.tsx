import React, {useEffect, useRef, useState} from 'react';
import {sendOffer, subscribe} from "./service/app.service.ts";
import {isRTCSubscriber} from "./hooks/getRTCConnectionType.ts";
import type {EventSourcePolyfill} from "event-source-polyfill";

const P2PChat: React.FC = () => {
    const [localSDP, setLocalSDP] = useState('');
    const [remoteSDP, setRemoteSDP] = useState('');
    const [messages, setMessages] = useState<{ sender: 'You' | 'Peer'; text: string }[]>([]);
    const [message, setMessage] = useState('');
    const [connected, setConnected] = useState(false);

    const location = window.location.pathname

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<RTCDataChannel | null>(null);
    const eventSourceRef = useRef<EventSourcePolyfill | null>(null)

    const createConnection = async (isOfferer: boolean) => {
        console.log('Creating connection as', isOfferer ? 'Offerer' : 'Answerer');

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        pcRef.current = pc;

        pc.onicecandidate = (event) => {
            if (event.candidate === null && pc.localDescription) {
                setLocalSDP(JSON.stringify(pc.localDescription));
            }
        };

        pc.onicegatheringstatechange = () => {
            console.log('ICE gathering state:', pc.iceGatheringState);
            if (pc.iceGatheringState === 'complete' && pc.localDescription) {
                console.log('ICE gathering complete');
                setLocalSDP(JSON.stringify(pc.localDescription));
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('ICE Connection State:', pc.iceConnectionState);
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setConnected(true);
                if (eventSourceRef.current) {
                    eventSourceRef.current.close()
                }
            }
        };

        if (isOfferer) {
            const channel = pc.createDataChannel('chat');
            setupChannel(channel);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
        } else {
            pc.ondatachannel = (event) => {
                console.log('Received data channel');
                const channel = event.channel;
                setupChannel(channel);
            };
        }
    };

    const setupChannel = (channel: RTCDataChannel) => {
        channelRef.current = channel;

        channel.onopen = () => {
            console.log('Channel open!');
            setConnected(true);
        };

        channel.onmessage = (event: MessageEvent<string>) => {
            console.log('Message received from peer:', event.data);
            setMessages((prev) => [...prev, { sender: 'Peer', text: event.data }]);
        };

        channel.onerror = (e) => console.error('Channel error:', e);
        channel.onclose = () => console.log('Channel closed');
    };

    const setRemote = async (remoteSDP: string) => {
        const pc = pcRef.current;
        if (!pc) return;

        try {
            console.log("Remote SDP ", remoteSDP)
            const desc = new RTCSessionDescription(JSON.parse(remoteSDP));
            await pc.setRemoteDescription(desc);
            console.log('Remote SDP set');

            if (desc.type === 'offer') {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                return answer;
            }
        } catch (err) {
            console.error('Failed to set remote SDP:', err);
        }
    };

    const sendMessage = (message: string) => {
        const text = message.trim();
        if (!text || !channelRef.current || channelRef.current.readyState !== 'open') {
            console.warn('Channel not open or message empty');
            return;
        }

        console.log('Sending message:', text);
        channelRef.current.send(text);
        setMessages((prev) => [...prev, { sender: 'You', text }]);
        setMessage('');
    };

    useEffect(() => {
        if (!isRTCSubscriber()) {
            sendMessage(location)
        }
    }, [location]);

    useEffect(() => {
        const eventSource = subscribe({kioskName: window.localStorage.getItem("kioskName") || "", deviceName: window.localStorage.getItem("deviceName") || ""})
        eventSourceRef.current = eventSource
        eventSource.onmessage = async (event) => {

            console.log("Event ", event)
            if (event.type === 'message') {
                const data = JSON.parse(event.data);
                switch (data?.state) {
                    case 'OFFER': {
                        const remoteSDP = JSON.stringify(data?.payload)
                        console.log(" JSON.stringify(data?.payload) ", remoteSDP)
                        setRemoteSDP(remoteSDP)
                        await createConnection(false)
                        const answer = await setRemote(remoteSDP)
                        console.log("answers ", answer)
                        if (answer) {
                            await sendOffer({kioskName: window.localStorage.getItem("kioskName") || "", deviceName: window.localStorage.getItem("deviceName") || "", payload: {offer: answer, state: 'OFFERED'}})
                        }
                        break;
                    }
                    case 'OFFERED': {
                        const remoteSDP = JSON.stringify(data?.payload)
                        setRemoteSDP(remoteSDP)
                        await setRemote(remoteSDP)
                        eventSource.close()
                        break;
                    }
                    default:
                        console.log("Not thing match ", data)
                        break;
                }
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [createConnection]);

    useEffect(() => {
        if (!localSDP) {
            createConnection(true)
        }
        if (!connected && localSDP && window.localStorage.getItem("deviceName") === 'machine' && !isRTCSubscriber()) {
            sendOffer({kioskName: window.localStorage.getItem("kioskName") || "", deviceName: window.localStorage.getItem("deviceName") || "", payload: {offer: JSON.parse(localSDP), state: 'OFFER'}})
        }

    }, [connected, createConnection, localSDP]);

    return (
        <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
            <h2>WebRTC Chat</h2>

            {!connected && (
                <div style={{ marginBottom: 20 }}>
                    <button onClick={() => createConnection(true)}>Start (Offer)</button>
                    <button onClick={() => createConnection(false)} style={{ marginLeft: 10 }}>
                        Join (Answer)
                    </button>
                </div>
            )}

            <textarea
                value={localSDP}
                readOnly
                rows={6}
                style={{ width: '100%', marginBottom: 10 }}
                placeholder="Copy this SDP and send to peer"
            />
            <textarea
                value={remoteSDP}
                onChange={(e) => setRemoteSDP(e.target.value)}
                rows={6}
                style={{ width: '100%', marginBottom: 10 }}
                placeholder="Paste peer's SDP here"
            />
            <button onClick={() => setRemote(remoteSDP)} style={{ marginBottom: 20 }}>
                Set Remote SDP
            </button>

            {connected && (
                <>
                    <div
                        style={{
                            border: '1px solid #ccc',
                            borderRadius: 8,
                            padding: 10,
                            height: 250,
                            overflowY: 'auto',
                            marginBottom: 10,
                            background: '#f9f9f9',
                        }}
                    >
                        {messages.map((msg, index) => (
                            <div key={index} style={{ marginBottom: 6, color: 'black' }}>
                                <strong>{msg.sender}:</strong> <span>{msg.text}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex' }}>
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(message)}
                            style={{ flexGrow: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                            placeholder="Type your message..."
                        />
                        <button
                            onClick={() => sendMessage(message)}
                            style={{
                                marginLeft: 8,
                                padding: '8px 16px',
                                background: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                        >
                            Send
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default P2PChat;
