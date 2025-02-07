import InputMenu from "./InputMenu"

const Sidebar = () => {

  const directions = ["North", "East", "South", "West"]

  return (
    <div className="bg-neutral-300 flex flex-col overflow-y-auto">
      <div className="mt-5 ml-5">
        <button type="button" className="bg-blue-500 text-white px-8 py-5 rounded-2xl shadow-md text-2xl hover:bg-blue-400 transition duration-300 cursor-pointer">History</button>
      </div>
      <div className="p-5 flex flex-col gap-5">
        {directions.map((direction, index) => (
          <InputMenu key={index} inbound={direction} />
        ))}
      </div>
    </div>
  )
}

export default Sidebar
