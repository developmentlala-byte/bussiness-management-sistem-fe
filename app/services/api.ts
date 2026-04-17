import axiosInstance from "./axios-instance";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiGet = async (url: string, params?: any | undefined) => {
  const { data: responseData } = await axiosInstance.get(url, { params });
  return responseData;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiPost = async (url: string, data?: any | undefined) => {
  const { data: responseData } = await axiosInstance.post(url, data);
  return responseData;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiPut = async (url: string, data?: any | undefined) => {
  const { data: responseData } = await axiosInstance.put(url, data);
  return responseData;
};

export const apiDelete = async (url: string) => {
  const { data: responseData } = await axiosInstance.delete(url);
  return responseData;
};
