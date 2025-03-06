import { useState, useEffect } from "react";

const OutboundItem = ({ direction, inboundDirection, trafficData, handleTrafficChange, disabled }) => {

    const directionCapitalize = direction.charAt(0).toUpperCase() + direction.slice(1)
    const inboundCapitalize = inboundDirection.charAt(0).toUpperCase() + inboundDirection.slice(1)

  return (
    <div className="flex justify-between items-center">
      <p className='text-xl p-5'>{`${inboundCapitalize} to ${directionCapitalize} Outbound`}</p>
    <input disabled={disabled} value={trafficData[inboundDirection][direction]} min="0" max="1000" onChange={(e) => {handleTrafficChange(inboundDirection, direction, e.target.value)}
    } className={`bg-secondary rounded-lg p-2 max-w-20 border-2 outline-none outline-black`}/>
    </div>
  )
}

export default OutboundItem