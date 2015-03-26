<?php 
include "./helper.php";

class SendMessage{
    public $clean = array();
    public $mongo = array();
    public $message = array();
    public $recipient;

    public function __construct()
    {
        session_start();
        $this->mongo["client"] = new Mongo();
        $this->mongo["collection"] = $this->mongo["client"]->messageApp;
        $this->mongo["userspublic"] = $this->mongo["collection"]->userspublic;
        $this->mongo["usersprivate"] = $this->mongo["collection"]->usersprivate;

        $message->sender["username"] = $_SESSION["user"]["username"];
        $message->sender["public"] = $_SESSION["user"]["key"]["public"];

    }
    public function __destruct()
    {
        session_write_close();
        if ($this->mongo)
        {
            $this->mongo["client"]->close();
        }
    }
    public function recipientIsClean()
    {
        $length = mb_strlen($_POST["recipient"]);
        if (ctype_alnum($_POST["recipient"]) && $length <= 64)
        {
            $this->clean["un"] = $_POST["recipient"];
            return true;
        }
        else
        {
            return false;
        }
    }
    public function userExists()
    {
        if ($this->recipient = $this->mongo["userspublic"]->findone(
                array("username" => $this->clean["un"])))
        {
            $this->message["recipient"]["username"] = $this->recipient["username"];
            return 1;
        } 
        else
        {
            return 0;
        }
    }
    public function escapePlaintext()
    {

        $this->clean["plaintext"] = htmlentities($_POST["plaintext"], ENT_QUOTES);
    }
    public function encryptPlaintext()
    {
        $keypair = Sodium::crypto_box_keypair_from_secretkey_and_publickey(
            hex2bin($_SESSION["user"]["key"]["secret"]), hex2bin($this->recipient["key"]["public"]));

        $this->message["nonce"] = Sodium::randombytes_buf(Sodium::CRYPTO_BOX_NONCEBYTES);

        $this->message["ciphertext"] = Sodium::crypto_box(
            $this->clean["plaintext"], $this->message["nonce"], $keypair);
            // $this->clean["plaintext"], $this->message["nonce"], $keypair);


        $this->message["ciphertext"] = bin2hex($this->message["ciphertext"]);
        $this->message["keypair"] = bin2hex($keypair);
        $this->message["nonce"] = bin2hex($this->message["nonce"]);


    }
    public function addContact()
    {
        $user = $this->message["recipient"]["username"];

        $query = array('username' => $_SESSION["user"]["username"]);
        $update = array('$set' => array("contacts.$user" => array("public" => $this->recipient["key"]["public"])));


        $this->mongo["usersprivate"]->update($query, $update);
    }
    public function send()
    {
        date_default_timezone_set('America/Los_Angeles');
        $date = new DateTime('NOW');
        $this->message["timestamp"] = $date->getTimestamp();
        $this->message["sender"]["username"] = $_SESSION["user"]["username"];
        $this->message["sender"]["public"] = $_SESSION["user"]["key"]["public"];
        // $this->message["sender"]["secret"] = $_SESSION["user"]["key"]["secret"];
        $time = $this->message["timestamp"];
        $sender = $this->message["sender"]["username"];

        $query = array('username' => $this->clean["un"]);
        $update = array('$set' => array("messages.$sender.$time" => $this->message));

        if ($this->mongo["usersprivate"]->update($query, $update))
        {
            $this->cleanup();
            return 1;
        }
        else
        {
            return 0;
        }
    }
    public function cleanup()
    {
        if(isset($this->recipient["username"]))
            Sodium::sodium_memzero($this->recipient["username"]);
        if(isset($this->recipient["lastLogin"]))
            unset($this->recipient["lastLogin"]);
        if(isset($this->recipient["key"]["public"]))
            Sodium::sodium_memzero($this->recipient["key"]["public"]);

        if(isset($this->message["recipient"]["username"]))
            Sodium::sodium_memzero($this->message["recipient"]["username"]);
        if(isset($this->message["nonce"]))
            Sodium::sodium_memzero($this->message["nonce"]);
        if(isset($this->message["ciphertext"]))
            Sodium::sodium_memzero($this->message["ciphertext"]);
        if(isset($this->message["timestamp"]))
            unset($this->message["timestamp"]);
        if(isset($this->message["sender"]["username"]))
            Sodium::sodium_memzero($this->message["sender"]["username"]);
        if(isset($this->message["sender"]["public"]))
            Sodium::sodium_memzero($this->message["sender"]["public"]);
    }
}

function sendMessage()
{
    $send = new SendMessage;
    $return = new Returning;

    if (!$send->recipientIsClean())
    {
        $return->exitNow(0, "Recipient name is not clean\n");
    }
    if (!$send->userExists())
    {
        $return->exitNow(0, "User does not exist\n");
    }
    $send->escapePlaintext();
    $send->encryptPlaintext();
    $send->addContact();
    if (!$send->send())
    {
        $return->exitNow(0, "Cloud not send the message\n");
    }

}
if ($_POST["recipient"] && $_POST["plaintext"])
{
    sendMessage();
}

?>