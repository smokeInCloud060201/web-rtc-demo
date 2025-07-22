import {EventSourcePolyfill} from "event-source-polyfill";

const BASE_URL = "http://localhost:8080/khaos/v1/admin/configs"
const TOKEN = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJEQTFNVGt3TnpWQ09VUTJSa1JFTVRJMk5Ea3dNVUV6TmpJd05EQTNNMFpHT1RJNU1rWTJOZyJ9.eyJodHRwczovL3NwZ3JvdXAuY29tLnNnL3VzZXJfbWV0YWRhdGEiOnsiY29ubmVjdGlvbiI6IlVuYXR0ZW5kZWRBY2Nlc3NEQiIsImVtYWlsIjoicXVhbnBoYW1Ac3Bncm91cC5jb20uc2ciLCJpYW1faWQiOiJhdXRoMHw2Mzk5N2Q4NmU4MWIwNjk3NWZiMzdlZWMiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImRpc3BsYXlfbmFtZSI6IlF1YW4uUGhhbSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZX0sImlzcyI6Imh0dHBzOi8vaWRlbnRpdHktcWEuc3BkaWdpdGFsLW5vbnByb2QuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfDYzOTk3ZDg2ZTgxYjA2OTc1ZmIzN2VlYyIsImF1ZCI6WyJodHRwczovL2toYW9zLWFwaS5hcHBzLnZwY2YtcWEuc3BkaWdpdGFsLmlvLyIsImh0dHBzOi8vaWRlbnRpdHktcWEuc3BkaWdpdGFsLW5vbnByb2QuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc1MzA3NzcwNSwiZXhwIjoxNzUzMTY0MTA1LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiYXpwIjoibmsyc2hIbXp4MHVkNUNISGZLa0E0TWgzMTFqbEwwWmUifQ.VLVVtYDx64Xl1Egtij3qHopFneYT_jmFKEZjj9PSLUR6UxBv4n7JIvTYpn9J6qj5f9g4X7hlWP3iLbyqTCE7FVtRBYnLH-NpGjtGjDl1w1Ux4RZcXQdgrhS06CDndH38JcwsMXnIecStKdqwZ8kfNYL4XcAmiiy-7PbRGXuJg4s5wtNL-6bemRuF95CTXqtyIbfGGcjcek8dfIb9FJehsElzOWXpf1-Z76uBiNOdrWQ96R-95IkDDqKpdpgYMUQVZ4KbDnaDxOkq5EdeyQlrouUoxnSrtj1aG9aPjjx95UTZ1hd1hk-4MeJbrdm2EhUic8qTqMCFZavAsrpVYCj9sQ"

const sendOffer = ({kioskName, deviceName, payload}: {kioskName: string, deviceName: string, payload: unknown }) => {
    console.log("payload ", payload)
    return fetch(`${BASE_URL}/rtc-connection?kioskName=${kioskName}&deviceName=${deviceName}`, {
        method: 'POST',
        headers: {"Authorization": TOKEN,  'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    })
}


const subscribe = ({kioskName, deviceName}: {kioskName: string, deviceName: string}) => {

    return new EventSourcePolyfill(`${BASE_URL}/rtc-connection/subscribe?kioskName=${kioskName}&deviceName=${deviceName}`, {headers: {"Authorization": TOKEN}})

}

export {sendOffer, subscribe}

