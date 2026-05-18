import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
});

export async function sendChatMessage({ message, history }) {
  try {
    const { data } = await api.post('/chat', {
      message,
      history,
    });

    return data.response;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Erro ao conectar com o backend da IA.');
  }
}
