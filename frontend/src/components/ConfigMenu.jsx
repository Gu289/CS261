import { useState } from "react"


const ConfigMenu = ({ trafficData, handleConfigurable }) => {

    const handleLeftTurn = () => {
        handleConfigurable("leftTurn")
    }

    const handleLanes = (e) => {
        handleConfigurable("numLanes", e.target.value)
    }

    return (
        <div className="bg-secondary p-5 rounded-lg shadow-md">
            <div className="flex items-center justify-center p-3 mb-3">
                <h1 className="text-2xl">Configurable Parameters</h1>
            </div>
            <div className="flex flex-col text-xl items-center justify-center bg-primary rounded-lg shadow-md p-3">
                <div className="flex flex-col items-center justify-center gap-2">
                    <h1>Left Turn</h1>
                    <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={trafficData.leftTurn} onChange={handleLeftTurn} className="sr-only peer" />
                        <div className="relative w-11 h-6 bg-white rounded-full dark:bg-gray-500 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all  dark:peer-checked:bg-blue-600 mb-3"></div>
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