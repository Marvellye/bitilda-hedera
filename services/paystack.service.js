import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function initializePaystackTransaction({ email, amount, callbackUrl, reference, metadata }) {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount,
        callback_url: callbackUrl,
        reference,
        metadata
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status) {
      return response.data.data.authorization_url;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('Paystack Initialization Error:', error.response?.data || error.message);
    throw error;
  }
}

export async function verifyPaystackPayment(reference) {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`
        }
      }
    );

    return response.data.data;
  } catch (error) {
    console.error('Paystack Verification Error:', error.response?.data || error.message);
    throw error;
  }
}

export async function createTransferRecipient(name, accountNumber, bankCode) {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transferrecipient',
      {
        type: "nuban",
        name: name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN"
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status) {
      return response.data.data.recipient_code;
    } else {
      throw new Error(response.data.message);
    }
  } catch (error) {
    console.error('Paystack Recipient Creation Error:', error.response?.data || error.message);
    throw error;
  }
}

export async function initiateTransfer(amount, recipientCode, reason = "Withdrawal") {
  try {
    const response = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source: "balance",
        amount: amount, // in kobo
        recipient: recipientCode,
        reason: reason
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Paystack Transfer Error:', error.response?.data || error.message);
    throw error;
  }
}
