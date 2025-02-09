import { useState } from "react";

const InboundItem = ({ direction, inboundData, handleInbound }) => {

  return (
    <div className="flex justify-between items-center">
      <p className='text-xl p-5'>{`${direction} Inbound`}</p>
    <input value={inboundData} onChange={(e) => handleInbound(e.target.value)} className='bg-secondary rounded-lg p-2 max-w-20 outline-none'/>
    </div>
  )
}

export default InboundItem