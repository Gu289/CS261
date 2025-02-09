import InputMenu from "./InputMenu"

const Sidebar = () => {

  const directions = ["North", "East", "South", "West"]

  const validateData = () => {

  }

  return (
    <div className="bg-background flex flex-col overflow-y-auto">
      <div className="mt-5 ml-5">
        <button type="button" className="bg-button px-8 py-5 rounded-2xl shadow-md text-2xl hover:bg-button-hover transition duration-300 cursor-pointer">History</button>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {directions.map((direction, index) => (
          <InputMenu key={index} inbound={direction} />
        ))}
        <div className="flex justify-center">
          <button onClick={validateData} className="text-2xl rounded-lg text-white bg-accent px-5 py-3 shadow-md cursor-pointer hover:bg-accent-hover transition duration-300" type="button">Start Simulation</button>
        </div>
        
      </div>
      <div>
        
      </div>
    </div>
  )
}

export default Sidebar
