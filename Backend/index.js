const https = require("https");
const bodyParser = require("body-parser");
// const axios = require("axios");
// Example dummy function hard coded to return the same weather
// In production, this could be your backend API or an external API
const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.listen(8001, (req, res) => {
  console.log("Server is listening on port number 8001");
});

async function fetchWeather(location) {
  const url = `http://api.weatherapi.com/v1/current.json?key=c9831f12de934f30af3154634243101&q=${location}&aqi=yes`;
  const data = await fetch(url);
  const res = await data.json();
  return {
    location: res.location.name,
    temperature: res.current.temp_c,
    humidity: res.current.humidity,
  };
}

async function get_current_weather(location, unit = "celsius") {
  const weather_info = await fetchWeather(location);
  console.log(weather_info);
  return JSON.stringify(weather_info);
}

async function runConversation(localName) {
  // Step 1: send the conversation and available functions to GPT
  const messages = [{ role: "user", content: `weather in ${localName}` }];
  const functions = [
    {
      name: "get_current_weather",
      description: "Get the current weather in a given location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The city and state, e.g. San Francisco, CA",
          },
          unit: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["location"],
      },
    },
  ];
  const requestData = JSON.stringify({
    model: "gpt-3.5-turbo",
    messages: messages,
    functions: functions,
    function_call: "auto", // auto is default, but we'll be explicit
  });
  const options = {
    hostname: "api.openai.com",
    path: "/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Bearer YOUR_API_KEY",
    },
  };
  const response = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(JSON.parse(data));
      });
    });
    req.on("error", (error) => {
      reject(error);
    });
    req.write(requestData);
    req.end();
  });
  console.log(response);
  const data = response.choices[0];
  console.log(data);
  const responseMessage = data?.message;
  // Step 2: check if GPT wanted to call a function
  if (responseMessage.function_call) {
    // Step 3: call the function
    const availableFunctions = {
      get_current_weather: get_current_weather,
    };
    const functionName = responseMessage.function_call.name;
    const functionToCall = availableFunctions[functionName];
    const functionArgs = JSON.parse(responseMessage.function_call.arguments);
    console.log(functionArgs);
    const functionResponse = await functionToCall(
      functionArgs.location,
      functionArgs.unit
    );
    // Step 4: send the info on the function call and function response to GPT
    messages.push(responseMessage); // extend conversation with assistant's reply
    messages.push({
      role: "function",
      name: functionName,
      content: functionResponse,
    }); // extend conversation with function response
    const secondRequestData = JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
    });
    const secondResponse = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(JSON.parse(data));
        });
      });
      req.on("error", (error) => {
        reject(error);
      });
      req.write(secondRequestData);
      req.end();
    });
    return secondResponse;
  }
}

app.post("/upload", (req, res) => {
  console.log("body is:-", req.body.localName);
  runConversation(req.body.localName)
    .then((response) => {
      console.log(response);
      res
        .status(200)
        .json({ data: response?.choices?.at(0)?.message?.content });
      console.log(response?.choices?.at(0)?.message?.content);
    })
    .catch((error) => {
      res.status(400).json({ error: error });
      //   console.error(error);
    });
});

