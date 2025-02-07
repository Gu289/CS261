import { useState } from 'react'
import { IoMdArrowDropright } from "react-icons/io";
import InputItem from './InputItem';

const InputMenu = ({ inbound }) => {

    const [isOpen, setIsOpen] = useState(false);
    const directions = ["North", "East", "South", "West"];

  return (
    <div className="bg-white p-5 rounded-lg select-none">
        <div className='flex items-center justify-between cursor-pointer transition duration-300 p-2 border-b border-blue-500 mb-5' onClick={() => setIsOpen(!isOpen)}>
            <h1 className="text-2xl" >{inbound} Traffic</h1>
            <IoMdArrowDropright className='w-6 h-6' />
        </div>
        {isOpen && (
            <div className="flex flex-col">
                
            {directions.map((direction, index) => (
                <InputItem key={index} direction={direction} inbound={inbound}/>
            )
            
            )}
            </div>
    )}
    </div>
  )
}

export default InputMenu
