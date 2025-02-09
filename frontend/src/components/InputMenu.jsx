import { useState } from 'react'
import InboundItem from './InboundItem'
import OutboundItem from './OutboundItem';

const InputMenu = ({ inbound }) => {

    const directions = ["North", "East", "South", "West"];
    const [inboundData, setInboundData] = useState(0);

    const handleInbound = (value) => {
      const number = Number(value)
      if(!isNaN(number) && value !== ""){
        setInboundData(Math.max(0, Math.min(1000, number)))
      } else if (value === ""){
        setInboundData("")        
      }
    }

  return (
    <div className="bg-secondary p-5 rounded-lg select-none">
        <div className='flex items-center justify-center transition duration-300 p-2 mb-3' onClick={() => setIsOpen(!isOpen)}>
            <h1 className="text-2xl" >{inbound} Traffic</h1>
        </div>
            <div className="flex flex-col justify-center bg-primary rounded-lg p-3">
            <InboundItem direction={inbound} inboundData={inboundData} handleInbound={handleInbound}/>
            {directions.map((direction, index) => direction != inbound && (
                <OutboundItem key={index} direction={direction} inbound={inbound}/>
            )
            )}
            </div>
    </div>
  )
}

export default InputMenu
