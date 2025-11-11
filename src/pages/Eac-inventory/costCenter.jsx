

const CostCenter = () => {

    return (
        <div>
                <form className="space-y-5">
                    
                       <div>
                         <label className="block text-gray-600 text-sm mb-2">
                           Project name
                         </label>
                         <div className="flex items-center border rounded-lg px-3 py-2">
                           <FiMail className="text-gray-400 mr-2" />
                           <input
                             type="text"
                             name="Project name"
                             placeholder="Project name"
                             className="w-full outline-none"
                             required
                           />
                         </div>
                       </div>

                        <div>
                         <label className="block text-gray-600 text-sm mb-2">
                           Project materials
                         </label>
                         <div className="flex items-center border rounded-lg px-3 py-2">
                           <FiMail className="text-gray-400 mr-2" />
                           <input
                             type="text"
                             name="Project materials"
                             placeholder="materials"
                             className="w-full outline-none"
                             required
                           />
                         </div>
                       </div>
           
                       {/* Submit */}
                       <button
                         type="submit"
                         className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                       >
                        Submit
                       </button>
                     </form>
        </div>
    )

}

export default  CostCenter;
