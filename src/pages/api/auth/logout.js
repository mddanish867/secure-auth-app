import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed",
    });
  }

  try {
    // Clear the token cookie
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development", // Use secure cookies in production
        expires: new Date(0), // Set expiration date in the past to delete the cookie
        sameSite: "strict",
        path: "/",
      })
    );

    // Return the response
    return res.status(200).json({
      message: "Logged out successfully",
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
        success: false,
        error: error.message
      });
  }
}
