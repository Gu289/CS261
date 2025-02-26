import InboundItem from './InboundItem'
import OutboundItem from './OutboundItem';
import { useState, useEffect } from 'react'

const InputMenu = ({ inboundDirection, directions, handleTrafficChange, trafficData }) => {

  const inboundCapitalize = inboundDirection.charAt(0).toUpperCase() + inboundDirection.slice(1)

  const [logicError, setLogicError] = useState(false)
  const [digitsError, setDigitsError] = useState(false)

  useEffect(() => {
    const { inbound, ...outbounds } = trafficData[inboundDirection]
    const totalOut = Object.values(outbounds).reduce((sum, val) => sum + val, 0);

    setLogicError(inbound !== totalOut);
    const { dir1, dir2, dir3 } = outbounds

    if(inbound > 2000 || dir1 > 2000 || dir2 > 2000 || dir3 > 2000){
      setDigitsError(true)
    } else{
      setDigitsError(false)
    }


      
}, [trafficData, inboundDirection, directions])

  return (
    <div className="bg-secondary p-5 rounded-lg select-none shadow-md">
        <div className='flex items-center justify-center transition duration-300 p-2 mb-3'>
            <h1 className="text-2xl" >{inboundCapitalize} Traffic</h1>
        </div>
            <div className="flex flex-col justify-center bg-primary rounded-lg shadow-md p-3">
            <InboundItem direction={inboundDirection} trafficData={trafficData} handleTrafficChange={handleTrafficChange} digitsError={digitsError}/>
            {/* make input items for each outbound directions  */}
            {directions.map((direction, index) => direction != inboundDirection && (
                <OutboundItem key={index} direction={direction} inboundDirection={inboundDirection} trafficData={trafficData} handleTrafficChange={handleTrafficChange} digitsError={digitsError}/>
            )
            )}
        </div>
        {logicError && <p className="text-center mt-2 text-red-500">Outbound values must be equal to Inbound values</p>}
        {digitsError && <p className="text-center mt-2 text-red-500">Values cannot exceed 2000vph</p>}
    </div>
  )
}

export default InputMenu
