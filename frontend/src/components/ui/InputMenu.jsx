import InboundItem from './InboundItem'
import OutboundItem from './OutboundItem';
import { useState, useEffect } from 'react'

const InputMenu = ({ inboundDirection, directions, handleTrafficChange, trafficData }) => {

  const inboundCapitalize = inboundDirection.charAt(0).toUpperCase() + inboundDirection.slice(1)

  return (
    <div className="bg-secondary p-5 rounded-lg select-none shadow-md">
        <div className='flex items-center justify-center transition duration-300 p-2 mb-3'>
            <h1 className="text-2xl" >{inboundCapitalize} Traffic</h1>
        </div>
            <div className="flex flex-col justify-center bg-primary rounded-lg shadow-md p-3">
            <InboundItem direction={inboundDirection} trafficData={trafficData} handleTrafficChange={handleTrafficChange}/>
            {/* make input items for each outbound directions  */}
            {directions.map((direction, index) => direction != inboundDirection && (
                <OutboundItem key={index} direction={direction} inboundDirection={inboundDirection} trafficData={trafficData} handleTrafficChange={handleTrafficChange}/>
            )
            )}
        </div>
    </div>
  )
}

export default InputMenu
