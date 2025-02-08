import { useState } from "react";

const InputItem = ({ direction, inbound }) => {

    const [data, setData] = useState(0);

  return (
    <div className="flex justify-between items-center">
      <p className='text-xl p-5'>{direction !== inbound ? `${inbound} to ${direction} Outbound` : `${inbound} Inbound`}</p>
    <input value={data} onChange={(e) => setData(e.target.value)} className='bg-secondary rounded-lg p-2 max-w-24 outline-none'/>
    </div>
  )
}

export default InputItem