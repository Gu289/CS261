import { useState, useEffect } from "react";

const OutboundItem = ({ direction, inboundDirection, trafficData, handleTrafficChange }) => {

    const [errorBorder, setErrorBorder] = useState(false)

    const directionCapitalize = direction.charAt(0).toUpperCase() + direction.slice(1)
    const inboundCapitalize = inboundDirection.charAt(0).toUpperCase() + inboundDirection.slice(1)

    useEffect(() => {
        const { inbound, ...outbounds } = trafficData[inboundDirection]
        const totalOut = Object.values(outbounds).reduce((sum, val) => sum + val, 0);

        setErrorBorder(inbound < totalOut);
    }, [trafficData, inboundDirection, direction])

  return (
    <div className="flex justify-between items-center">
      <p className='text-xl p-5'>{`${inboundCapitalize} to ${directionCapitalize} Outbound`}</p>
    <input value={trafficData[inboundDirection][direction]} min="0" max="1000" onChange={(e) => {handleTrafficChange(inboundDirection, direction, e.target.value)}
    } className={`bg-secondary rounded-lg p-2 max-w-20 border-2 outline-none ${
        errorBorder ? "border-red-500" : "outline-black"
    }`}/>
    </div>
  )
}

export default OutboundItem