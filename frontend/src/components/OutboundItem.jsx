import { useState } from "react";

const OutboundItem = ({ direction, inbound }) => {

    const [data, setData] = useState(0);

  return (
    <div className="flex justify-between items-center">
      <p className='text-xl p-5'>{`${inbound} to ${direction} Outbound`}</p>
    <input value={data} min="0" max="1000" onChange={(e) => setData(e.target.value)} className='bg-secondary rounded-lg p-2 max-w-20 outline-none'/>
    </div>
  )
}

export default OutboundItem