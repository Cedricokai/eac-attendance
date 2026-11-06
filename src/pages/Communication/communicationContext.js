import { createContext, useContext } from "react";
export const CommunicationContext = createContext(null);
export const useCommunication = () => useContext(CommunicationContext);
