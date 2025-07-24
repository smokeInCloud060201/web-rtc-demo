import {EventSourcePolyfill} from "event-source-polyfill";

const BASE_URL = "http://localhost:8080/khaos/v1/admin/configs"
const TOKEN = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlJEQTFNVGt3TnpWQ09VUTJSa1JFTVRJMk5Ea3dNVUV6TmpJd05EQTNNMFpHT1RJNU1rWTJOZyJ9.eyJodHRwczovL3NwZ3JvdXAuY29tLnNnL3VzZXJfbWV0YWRhdGEiOnsiY29ubmVjdGlvbiI6IlVuYXR0ZW5kZWRBY2Nlc3NEQiIsImVtYWlsIjoicXVhbnBoYW1Ac3Bncm91cC5jb20uc2ciLCJpYW1faWQiOiJhdXRoMHw2Mzk5N2Q4NmU4MWIwNjk3NWZiMzdlZWMiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImRpc3BsYXlfbmFtZSI6IlF1YW4uUGhhbSIsInBob25lX3ZlcmlmaWVkIjpmYWxzZX0sImlzcyI6Imh0dHBzOi8vaWRlbnRpdHktcWEuc3BkaWdpdGFsLW5vbnByb2QuYXV0aDAuY29tLyIsInN1YiI6ImF1dGgwfDYzOTk3ZDg2ZTgxYjA2OTc1ZmIzN2VlYyIsImF1ZCI6WyJodHRwczovL2toYW9zLWFwaS5hcHBzLnZwY2YtcWEuc3BkaWdpdGFsLmlvLyIsImh0dHBzOi8vaWRlbnRpdHktcWEuc3BkaWdpdGFsLW5vbnByb2QuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc1MzMyMTI5OCwiZXhwIjoxNzUzNDA3Njk4LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiYXpwIjoibmsyc2hIbXp4MHVkNUNISGZLa0E0TWgzMTFqbEwwWmUifQ.FMztSmRvU53S_3RwxNC0X4V4o9SW7suZgHLrZxtAFNLCWoShmM1nBeSezhbwb9bS2MGPaOvT_vdrzbbIcaBSKWKviq_3E9KczneIrg22RrNPlaAhhSPM0sHA8ndIsLjtHyU9C2ywlfXDL4iW53LyT68w-Ypk2vQOYGeDe0egvNL04GdVI0nOpt561xKf7ijIyKXs76vK6Zdu0Sbtz1xxDeA_nUr8RMaU4Uk26g-TcUGJEdCVSxQHex3uDC02Lr7drkZpUhG9oeVC-qTsFxkTMru_bwr6pu1Wo0FSetrGbISJVnphdOgn2y2j5V-qyYlM14BR-MEpO_5dt3iccPXJMg"

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

