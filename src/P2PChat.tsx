import React, { useRef, useState } from 'react';

const P2PChat: React.FC = () => {
    const [localSDP, setLocalSDP] = useState('');
    const [remoteSDP, setRemoteSDP] = useState('');
    const [messages, setMessages] = useState<{ sender: 'You' | 'Peer'; text: string }[]>([]);
    const [message, setMessage] = useState('');
    const [connected, setConnected] = useState(false);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<RTCDataChannel | null>(null);

    const createConnection = async (isOfferer: boolean) => {
        const pc = new RTCPeerConnection();

        pc.onicecandidate = () => {
            if (pc.localDescription) {
                setLocalSDP(JSON.stringify(pc.localDescription));
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
        };

        if (isOfferer) {
            const channel = pc.createDataChannel('chat');
            setupChannel(channel);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
        } else {
            pc.ondatachannel = (event) => {
                console.log("onDataChannel ", event)
                setupChannel(event.channel);
            };
        }

        pcRef.current = pc;
    };

    const setupChannel = (channel: RTCDataChannel) => {
        channelRef.current = channel;

        channel.onopen = () => {
            console.log('Channel open!');
            setConnected(true);
        };

        channel.onmessage = (event: MessageEvent<string>) => {
            console.log("onMessage ", event)
            setMessages((prev) => [...prev, { sender: 'Peer', text: event.data }]);
        };
    };

    const setRemote = async () => {
        const pc = pcRef.current;
        if (!pc) return;

        const desc = new RTCSessionDescription(JSON.parse(remoteSDP));
        await pc.setRemoteDescription(desc);

        if (desc.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
        }
    };

    const sendMessage = () => {
        const text = message.trim();
        if (!text || !channelRef.current || channelRef.current.readyState !== 'open') return;

        channelRef.current.send(text);
        console.log("Message sended ", text)
        setMessages((prev) => [...prev, { sender: 'You', text }]);
        setMessage('');
    };

    console.log("connected ", connected)

    return (
        <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
            <h2>WebRTC</h2>

            {!connected && (
                <div style={{ marginBottom: 20 }}>
                    <button onClick={() => createConnection(true)}>Start (Offer)</button>
                    <button onClick={() => createConnection(false)} style={{ marginLeft: 10 }}>Join (Answer)</button>
                </div>
            )}

            <div style={{ marginBottom: 10 }}>
        <textarea
            value={localSDP}
            readOnly
            rows={5}
            style={{ width: '100%' }}
            placeholder="Copy this SDP and send to peer"
        />
            </div>

            <div style={{ marginBottom: 10 }}>
        <textarea
            value={remoteSDP}
            onChange={(e) => setRemoteSDP(e.target.value)}
            rows={5}
            style={{ width: '100%' }}
            placeholder="Paste peer's SDP here"
        />
                <button onClick={setRemote} style={{ marginTop: 5 }}>Set Remote SDP</button>
            </div>

            {connected && (
                <>
                    <div style={{
                        border: '1px solid #ccc',
                        borderRadius: 8,
                        padding: 10,
                        height: 250,
                        overflowY: 'auto',
                        marginBottom: 10,
                        background: '#f9f9f9'
                    }}>
                        {messages.map((msg, index) => (
                            <div key={index} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between' }} color='black'>
                                <strong style={{color: 'black'}}>{msg.sender}:</strong> <span style={{color: 'black'}}>{msg.text}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex' }}>
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            style={{ flexGrow: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                            placeholder="Type your message..."
                        />
                        <button
                            onClick={sendMessage}
                            style={{
                                marginLeft: 8,
                                padding: '8px 16px',
                                background: '#007bff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        >
                            Send
                        </button>
                    </div>

                    <p style={{ marginTop: 10, color: 'green' }}>Connected — Start Chatting!</p>
                </>
            )}
        </div>
    );
};

export default P2PChat;
