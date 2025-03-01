
const ConfigMenu = ({ trafficData, handleConfigurable, setGlobalLeftTurn }) => {

    const handleLeftTurn = (e) => {
        handleConfigurable("leftTurn", e.target.checked)
        setGlobalLeftTurn(e.target.checked)
    }

    const handleLanes = (e) => {
        handleConfigurable("numLanes", Number(e.target.value))
    }

    return (
        <div className="bg-secondary p-5 rounded-lg shadow-md">
            <div className="flex items-center justify-center p-3 mb-3">
                <h1 className="text-2xl">Configurable Parameters</h1>
            </div>
            <div className="flex flex-col text-xl items-center justify-center bg-primary rounded-lg shadow-md p-3 gap-2">
                <div className="flex flex-col items-center justify-center gap-2">
                    <h1>Left Turn</h1>
                    <label className="inline-flex relative items-center cursor-pointer">
                        <input type="checkbox" checked={trafficData.leftTurn} onChange={handleLeftTurn} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer  peer-focus:ring-green-300  peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
                    </label>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                    <h1>Number of Lanes</h1>
                    <select className="cursor-pointer text-sm rounded-lg p-3 dark:bg-gray-600 dark:placeholder-gray-400 dark:text-white mb-2" value={trafficData.lanes} onChange={handleLanes}>
                        <option disabled defaultValue={1}>Choose number of lanes</option>
                        <option value={2}>2 Lanes</option>
                        <option value={3}>3 Lanes</option>
                        <option value={4}>4 Lanes</option>
                    </select>
                </div>
            </div>
        </div>
    )
}

export default ConfigMenu