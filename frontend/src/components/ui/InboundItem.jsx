
const InboundItem = ({ direction, trafficData, handleTrafficChange, disabled }) => {

  const directionCapitalize = direction.charAt(0).toUpperCase() + direction.slice(1)
  
  return (
    <div className="flex justify-between items-center">
      <p className='text-xl p-5'>{`${directionCapitalize} Inbound`}</p>
    <input disabled={disabled} value={trafficData[direction].inbound} onChange={(e) => handleTrafficChange(direction, "inbound", e.target.value)} className={`bg-secondary rounded-lg p-2 max-w-20 outline-none border-2 outline-black` }/>
    </div>
  )
}

export default InboundItem