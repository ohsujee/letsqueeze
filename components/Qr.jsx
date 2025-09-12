import QRCode from "react-qr-code";
export default function Qr({ value, size=192 }) {
  return <div className="p-3 bg-white border-4 border-black rounded-2xl inline-block"><QRCode value={value} size={size} /></div>;
}
