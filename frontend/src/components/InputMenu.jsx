import { useState } from 'react'
import { IoMdArrowDropright } from "react-icons/io";
import InputItem from './InputItem';

const InputMenu = ({ inbound }) => {

    const [isOpen, setIsOpen] = useState(false);
    const directions = ["North", "East", "South", "West"];

  return (
    <div className="bg-secondary p-5 rounded-lg select-none">
        <div className='flex items-center justify-center transition duration-300 p-2 mb-5' onClick={() => setIsOpen(!isOpen)}>
            <h1 className="text-2xl" >{inbound} Traffic</h1>
        </div>
            <div className="flex flex-col justify-center bg-primary rounded-lg p-3">
            {directions.map((direction, index) => (
                <InputItem key={index} direction={direction} inbound={inbound}/>
            )
            )}
            </div>
    </div>
  )
}

export default InputMenu
