import { User } from '../models/users.js';
import { sendMail } from '../utils/sendMail.js';
import { sendToken } from '../utils/sendToken.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // const { avatar } = req.files;

    let user = await User.findOne({ email });

    if (user) {
      return res
        .status(400)
        .json({ success: false, message: 'User already exists' });
    }

    const otp = Math.floor(Math.random() * 10000);

    user = await User.create({
      name,
      email,
      password,
      avatar: {
        public_id: '',
        url: '',
      },
      otp,
      otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
    });

    await sendMail(email, 'Verify your account', `Your OTP is ${otp}`);

    sendToken(
      res,
      user,
      200,
      'OTP sent to your account. Please verify your account'
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verify = async (req, res) => {
  try {
    const otp = Number(req.body.otp);
    const user = await User.findById(req.user._id);

    if (user.otp !== otp || user.otp_expiry < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid OTP or has been expired.' });
    }

    user.verified = true;
    user.otp = null;
    user.otp_expiry = null;

    await user.save();

    sendToken(res, user, 200, 'Account Verified');
  } catch (error) {
    res.stats(500).json({ success: false, message: error.message });
    console.error('error1123', error);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Please enter all fields.' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Email or Password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Email or Password' });
    }

    sendToken(res, user, 200, 'Login successfull.');
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res
      .status(200)
      .cookie('token', null, {
        expires: new Date(Date.now()),
      })
      .json({ success: true, message: 'Logout successful.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addTask = async (req, res) => {
  try {
    const { title, description } = req.body;
    const user = await User.findById(req.user._id);

    user.tasks.push({
      title,
      description,
      completed: false,
      createdAt: new Date(Date.now()),
    });

    await user.save();

    res
      .status(200)
      .json({ success: true, message: 'Task added successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const user = await User.findById(req.user._id);

    user.tasks = user.tasks.filter(
      (task) => task._id.toString() !== taskId.toString()
    );

    await user.save();

    res
      .status(200)
      .json({ success: true, message: 'Task removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const user = await User.findById(req.user._id);

    user.task = user.tasks.find(
      (task) => task._id.toString() === taskId.toString()
    );

    user.task.completed = !user.task.completed;

    await user.save();

    res
      .status(200)
      .json({ success: true, message: 'Task updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    sendToken(res, user, 201, `Welcome back ${user.name}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const { name } = req.body;
    // const { avatar } = req.files;
    console.log(user);
    console.log(name);

    if (name) {
      user.name = name;
    }
    await user.save();
    // if (avatar) {
    // }
    res
      .status(200)
      .json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Please enter all fields.' });
    }
    const isMatch = await user.comparePassword(oldPassword);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Old Password.' });
    }

    user.password = newPassword;

    await user.save();
    res
      .status(200)
      .json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid Email' });
    }

    const otp = Math.floor(Math.random() * 10000);
    user.reset_password_otp = otp;
    user.reset_password_otp_expiry = Date.now() + 10 * 60 * 1000;

    await user.save();

    const message = `Your OTP for reseting password is ${otp}. If you don't request any password reseting. Then please ignore this.`;

    await sendMail(email, 'Request for Reseting Password', message);

    res.status(200).json({ success: true, message: `OTP sent to ${email}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const user = await User.findOne({
      reset_password_otp: otp,
      reset_password_otp_expiry: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'OTP Invalid or has been Expired.' });
    }

    user.password = newPassword;
    user.reset_password_otp = null;
    user.reset_password_otp_expiry = null;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: `Password reset successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
