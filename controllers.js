const dotenv = require("dotenv");
dotenv.config();
const https = require("https");
const url = require("url");
const querystring = require("querystring");

const redirect_uri = `http://${process.env.backendIPAddress}/courseville/access_token`;
const authorization_url = `https://www.mycourseville.com/api/oauth/authorize?response_type=code&client_id=${process.env.client_id}&redirect_uri=${redirect_uri}`;
const access_token_url = "https://www.mycourseville.com/api/oauth/access_token";

// db
const { v4: uuidv4 } = require("uuid");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  PutCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { log } = require("console");
const docClient = new DynamoDBClient({ regions: process.env.AWS_REGION });
const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

exports.authApp = (req, res) => {
  res.redirect(authorization_url);
};

exports.accessToken = (req, res) => {
  const parsedUrl = url.parse(req.url);
  const parsedQuery = querystring.parse(parsedUrl.query);

  if (parsedQuery.error) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Authorization error: ${parsedQuery.error_description}`);
    return;
  }

  if (parsedQuery.code) {
    const postData = querystring.stringify({
      grant_type: "authorization_code",
      code: parsedQuery.code,
      client_id: process.env.client_id,
      client_secret: process.env.client_secret,
      redirect_uri: redirect_uri,
    });

    const tokenOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": postData.length,
      },
    };

    const tokenReq = https.request(
      access_token_url,
      tokenOptions,
      (tokenRes) => {
        let tokenData = "";
        tokenRes.on("data", (chunk) => {
          tokenData += chunk;
        });
        tokenRes.on("end", () => {
          const token = JSON.parse(tokenData);
          req.session.token = token;
          if (token) {
            res.writeHead(302, {
              Location: `http://${process.env.frontendIPAddress}/component/calendar.html`,
            });
            res.end();
          }
        });
      }
    );
    tokenReq.on("error", (err) => {
      console.error(err);
    });
    tokenReq.write(postData);
    tokenReq.end();
  } else {
    res.writeHead(302, { Location: authorization_url });
    res.end();
  }
};

exports.getProfileInformation = async (req, res) => {
  try {
    const profileOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };

    const profile = await new Promise((resolve, reject) => {
      const profileReq = https.request(
        "https://www.mycourseville.com/api/v1/public/get/user/info",
        profileOptions,
        (profileRes) => {
          let profileData = "";
          profileRes.on("data", (chunk) => {
            profileData += chunk;
          });
          profileRes.on("end", () => {
            const profile = JSON.parse(profileData);
            resolve(profile);
          });
        }
      );
      profileReq.on("error", (err) => {
        console.error(err);
        reject(err);
      });
      profileReq.end();
    });

    return profile.data;
  } catch (error) {
    console.log(error);
    console.log("Please logout, then login again.");
    res.status(500).send("Error getting profile");
  }
};

exports.getCourses = async (req, res) => {
  try {
    const courseOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };

    const course = await new Promise((resolve, reject) => {
      const courseReq = https.request(
        "https://www.mycourseville.com/api/v1/public/get/user/courses",
        courseOptions,
        (courseRes) => {
          let courseData = "";
          courseRes.on("data", (chunk) => {
            courseData += chunk;
          });
          courseRes.on("end", () => {
            const course = JSON.parse(courseData);
            resolve(course);
          });
        }
      );
      courseReq.on("error", (err) => {
        console.error(err);
        reject(err);
      });
      courseReq.end();
    });

    return course.data.student;
  } catch (error) {
    console.log(error);
    console.log("Please logout, then login again.");
    res.status(500).send("Error getting course");
  }
};

exports.getCourseName = async (req, res, cv_cid) => {
  try {
    const courseOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };

    const course = await new Promise((resolve, reject) => {
      const courseReq = https.request(
        `https://www.mycourseville.com/api/v1/public/get/course/info?cv_cid=${cv_cid}`,
        courseOptions,
        (courseRes) => {
          let courseData = "";
          courseRes.on("data", (chunk) => {
            courseData += chunk;
          });
          courseRes.on("end", () => {
            const course = JSON.parse(courseData);
            resolve(course);
          });
        }
      );
      courseReq.on("error", (err) => {
        console.error(err);
        reject(err);
      });
      courseReq.end();
    });

    return course.data.title;
  } catch (error) {
    console.log(error);
    console.log("Please logout, then login again.");
    res.status(500).send("Error getting course");
  }
};

exports.getCourseAssignments = async (req, res, cv_cid) => {
  try {
    const assignmentOptions = {
      headers: {
        Authorization: `Bearer ${req.session.token.access_token}`,
      },
    };

    const assignment = await new Promise((resolve, reject) => {
      const assignmentReq = https.request(
        `https://www.mycourseville.com/api/v1/public/get/course/assignments?cv_cid=${cv_cid}&detail=1`,
        assignmentOptions,
        (assignmentRes) => {
          let assignmentData = "";
          assignmentRes.on("data", (chunk) => {
            assignmentData += chunk;
          });
          assignmentRes.on("end", () => {
            const assignment = JSON.parse(assignmentData);
            resolve(assignment);
          });
        }
      );
      assignmentReq.on("error", (err) => {
        console.error(err);
        reject(err);
      });
      assignmentReq.end();
    });

    return assignment.data;
  } catch (error) {
    console.log(error);
    console.log("Please logout, then login again.");
    res.status(500).send("Error getting assignment");
  }
};

exports.logout = (req, res) => {
  req.session.destroy();
  res.redirect(
    `http://${process.env.frontendIPAddress}/component/loginpage.html`
  );
  res.end();
};

// GET EVERYTHING
exports.getStudent = async (req, res) => {
  // profile
  const profile = await this.getProfileInformation(req, res);
  const userId = String(profile.account.uid);
  const studentId = String(profile.student.id);
  const name = profile.student.firstname_en + " " + profile.student.lastname_en;
  // Check if this user existed in db, if not -> create user
  try {
    const userExistence = await this.userExisted(userId);
    if (userExistence === false) {
      await this.createUser(userId, name);
    }
  } catch (err) {
    console.log("line 268");
    console.log(err);
    res.status(500).send(err);
  }

  //================================================================================//
  // myCourse
  let myCourse = [];
  // get courses from mcv
  const course = await this.getCourses(req, res);
  for (let c of course) {
    if (c.year === "2022" && c.semester === 2) {
      const courseName = await this.getCourseName(req, res, c.cv_cid);
      myCourse.push(courseName);
      // get assignment of each course
      const assignments = await this.getCourseAssignments(req, res, c.cv_cid);
      // create as event if it is valid
      for (const a of assignments) {
        const date = new Date(a.duetime * 1000); // Deadline
        if (date > new Date()) {
          // is not expired
          // check if this existed in DB
          if (!(await this.eventDataExisted(String(a.itemid)))) {
            // not existed -> create a new one
            const eventFields = {
              userId: String(userId),
              eventId: String(a.itemid),
              name: a.title,
              creater: name,
              detail: "-",
              category: courseName,
              date: date.getDate(),
              month: date.getMonth() + 1,
              year: date.getFullYear(),
              day: daysOfWeek[date.getDay()],
              starttime: { hour: date.getHours(), min: date.getMinutes() },
              endtime: { hour: 24, min: 60 },
              dateISO: date.toISOString(),
              member: [name],
            };
            const updatedReq = {
              ...req,
              body: {
                ...req.body,
                ...eventFields,
              },
            };
            await this.createEvent(updatedReq, res);
          }
        }
      }
    }
  }
  //================================================================================//
  // myCalendar
  const myCalendar = await this.getAllEvents(userId);
  //================================================================================//
  // Notification
  const noti = await this.getAllInvitations(userId);
  const data = { userId, studentId, name, myCourse, myCalendar, noti };
  console.log(data);
  res.send(data);
};

// Create a new event
exports.createEvent = async (req, res) => {
  console.log("++++++++++++++++++++++++++");
  console.log(req.body);
  let eventId = req.body.eventId;
  // validate fields
  const requiredFields = [
    "name",
    "creater",
    "detail",
    "category",
    "date",
    "month",
    "year",
    "starttime",
    "endtime",
  ];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      console.log(`Missing ${field} field when creating event`);
      res.status(400).send(`Missing ${field} field`);
    }
  }

  if (!eventId || eventId === null) {
    eventId = "Event#" + uuidv4();
  } else eventId = "Event#" + eventId;
  req.body.eventId = eventId;
  const params = {
    TableName: process.env.aws_table_name,
    Item: { PK: eventId, SK: eventId, ...req.body },
  };
  try {
    // create event
    await docClient.send(new PutCommand(params));
    // let creater join event
    // console.log("sent put com");
    const newreq = {
      ...req,
      eventId,
    };
    await this.createUserEvent(newreq, res);
    // console.log("sent UE com");

    if (req.body.member) {
      for (const name of req.body.member) {
        if (name != req.body.creater) {
          // invite other user
          const idToInvite = await this.queryUserId(name);
          await this.createInvitation(idToInvite, req.body.creater, eventId);
        }
      }
    }
  } catch (err) {
    console.log("Create event failed");
    console.log(err);
    res.status(500).send(err);
  }
};

// Use to check if it existed in DB
exports.eventDataExisted = async (eventId) => {
  const params = {
    TableName: process.env.aws_table_name,
    Key: {
      PK: `Event#${eventId}`,
      SK: `Event#${eventId}`,
    },
  };

  try {
    const data = await docClient.send(new GetCommand(params));
    if (data.Item) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.log("Check event data existence failed");
    res.status(500).send(err);
  }
};

// Invite
exports.createInvitation = async (idToInvite, inviter, eventId) => {
  const invitationId = uuidv4();
  // const { userId, inviter, eventId } = req.body;
  // if (!userId || !inviter || !eventId) {
  //   res.status(400).send("Missing required attributes");
  //   return;
  // }
  const params = {
    TableName: process.env.aws_table_name,
    Item: {
      PK: `User#${idToInvite}`,
      SK: `Invite#${invitationId}`,
      inviter: inviter,
      eventId: eventId,
    },
  };
  try {
    await docClient.send(new PutCommand(params));
    // res.send(params.Item);
    console.log("Invite success");
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.deleteInvitation = async (req, res) => {
  const invitationId = req.body.invitationId;
  const userId = req.body.userId;
  if (!invitationId || !userId) {
    res.status(400).send("Invitation ID and user ID are required");
    return;
  }
  const params = {
    TableName: process.env.aws_table_name,
    Key: {
      PK: `User#${userId}`,
      SK: invitationId,
    },
  };
  try {
    await docClient.send(new DeleteCommand(params));
    res.send(`Event invitation with ID ${invitationId} deleted`);
  } catch (err) {
    console.log("Delete invitation failed");
    res.status(500).send(err);
  }
};

exports.getAllInvitations = async (userId) => {
  let data = [];
  const params = {
    TableName: process.env.aws_table_name,
    KeyConditionExpression: "PK = :pk and begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `User#${userId}`,
      ":sk": "Invite#",
    },
  };
  try {
    const res = await docClient.send(new QueryCommand(params));
    for (const inv of res.Items) {
      const event = await this.queryEventData(inv.eventId.split("#").pop());
      data.push({ ...inv, event: event });
    }
    return data;
  } catch (err) {
    console.log("Get all invitaion failed");
    return null;
  }
};

// User - Event relation
exports.createUserEvent = async (req, res) => {
  // console.log(req.body.userId);
  // console.log(req.body.eventId);
  // console.log(req.body.creater);
  const requiredAttributes = ["userId", "eventId", "creater"];
  // Validation
  for (const attribute of requiredAttributes) {
    if (!req.body[attribute]) {
      console.log(`Attribute '${attribute}' is missing`);
      res.status(400).send(`Attribute '${attribute}' is missing`);
      return;
    }
  }
  // console.log(req.body);
  // let dateISO = req.body.dateISO;
  // let date;
  // if (!dateISO) {
  //   date = new Date(
  //     req.body.year,
  //     req.body.month - 1,
  //     req.body.date,
  //     req.body.starttime.hour,
  //     req.body.starttime.min,
  //     0,
  //     0
  //   );
  // } else date = new Date(dateISO);
  // // console.log(date);
  // date = date.toISOString();
  const params = {
    TableName: process.env.aws_table_name,
    Item: {
      PK: `User#${req.body.userId}`,
      SK: req.body.eventId,
      //dates: date,
    },
  };
  const params2 = {
    TableName: process.env.aws_table_name,
    Item: {
      PK: req.body.eventId,
      SK: `User#${req.body.userId}`,
      name: req.body.creater,
    },
  };
  try {
    await docClient.send(new PutCommand(params));
    await docClient.send(new PutCommand(params2));
    console.log("Join event successfully");
  } catch (err) {
    console.log("Create user-event relation failed");
    res.status(500).send(err);
  }
};

exports.deleteUserEvent = async (req, res) => {
  console.log("start del UE");
  console.log(`Event#${req.body.eventId}`);
  console.log(`User#${req.body.userId}`);
  console.log(req.body);
  const params = {
    TableName: process.env.aws_table_name,
    Key: {
      PK: `User#${req.body.userId}`,
      SK: req.body.eventId,
    },
  };
  const params2 = {
    TableName: process.env.aws_table_name,
    Key: { PK: req.body.eventId, SK: `User#${req.body.userId}` },
  };
  try {
    await docClient.send(new DeleteCommand(params));
    await docClient.send(new DeleteCommand(params2));
    console.log("DEL UE SS");
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
};

// Event
exports.queryEventData = async (eventId) => {
  const params = {
    TableName: process.env.aws_table_name,
    KeyConditionExpression: "PK = :pk and SK = :sk",
    ExpressionAttributeValues: {
      ":pk": `Event#${eventId}`,
      ":sk": `Event#${eventId}`,
    },
  };
  try {
    const eventData = await docClient.send(new QueryCommand(params));
    console.log(eventId);
    const year = eventData.Items[0].year;
    const month = eventData.Items[0].month;
    const date = eventData.Items[0].date;
    const formattedDate = `${year}-${month.toString().padStart(2, "0")}-${date
      .toString()
      .padStart(2, "0")}`;
    const members = await this.getMember(eventId.split("#").pop());
    const item = eventData.Items[0];
    item.member = members;

    return {
      [formattedDate]: item,
    };
  } catch (err) {
    console.log("Query event data failed");
    console.log(err);
    return null;
  }
};

exports.getAllEvents = async (userId) => {
  const params = {
    TableName: process.env.aws_table_name,
    KeyConditionExpression: "PK = :pk and begins_with(SK, :event)",
    ExpressionAttributeValues: {
      ":pk": `User#${userId}`,
      ":event": "Event",
    },
  };
  try {
    const events = await docClient.send(new QueryCommand(params));
    let data = {};
    for (let e of events.Items) {
      const eventData = await this.queryEventData(e.SK.split("#").pop());
      if (eventData) {
        const date = Object.keys(eventData)[0];
        if (data[date]) {
          data[date].push(eventData[date]);
        } else {
          data[date] = [eventData[date]];
        }
      }
    }
    return data;
  } catch (err) {
    console.log("Get all event failed");
    return null;
  }
};

// User
exports.userExisted = async (userId) => {
  const params = {
    TableName: process.env.aws_table_name,
    Key: {
      PK: `User#${userId}`,
      SK: `User#${userId}`,
    },
  };
  try {
    const res = await docClient.send(new GetCommand(params));
    if (res.Item) return true;
    else return false;
  } catch (err) {
    console.log("Check user existence failed");
    return null;
  }
};

exports.createUser = async (userId, name) => {
  const params = {
    TableName: process.env.aws_table_name,
    Item: {
      PK: `User#${userId}`,
      SK: `User#${userId}`,
    },
  };
  const params2 = {
    TableName: process.env.aws_table_name,
    Item: {
      PK: `Name#${name}`,
      SK: `User#${userId}`,
    },
  };
  try {
    await docClient.send(new PutCommand(params));
    await docClient.send(new PutCommand(params2));
    console.log("User created successfully");
  } catch (err) {
    console.log("Create user failed");
    res.status(500).send(err);
  }
};

exports.getMember = async (eventId) => {
  const params = {
    TableName: process.env.aws_table_name,
    KeyConditionExpression: "PK = :pk and begins_with(SK, :user)",
    ExpressionAttributeValues: {
      ":pk": `Event#${eventId}`,
      ":user": "User",
    },
  };
  try {
    const events = await docClient.send(new QueryCommand(params));
    let data = [];
    for (let e of events.Items) {
      data.push(e.name);
    }
    return data;
  } catch (err) {
    console.log("get member failed");
    return null;
  }
};

exports.queryUserId = async (name) => {
  console.log(name);
  const params = {
    TableName: process.env.aws_table_name,
    KeyConditionExpression: "PK = :pk and begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `Name#${name}`,
      ":sk": "User#",
    },
  };
  try {
    const res = await docClient.send(new QueryCommand(params));
    const user = res.Items[0];
    if (user) {
      const userId = user.SK.split("#").pop();
      return userId;
    } else {
      console.log(`User with name '${name}' not found`);
      return null;
    }
  } catch (err) {
    console.log("Query userId failed", err);
    return null;
  }
};
